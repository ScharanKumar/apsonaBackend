const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const cors = require("cors")
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json())
app.use(cors())
const dbPath = path.join(__dirname, "database.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    app.listen(3030, () => {
      console.log(`Server Running at http://localhost:3030`);
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          next();
        }
      });
    }
  };

  app.get("/get/notes/all/:name", authenticateToken, async(request,response)=>{
    const {name}=request.params
    
    const query=`SELECT * from note where person_username like '${name}';`
    const dbResponse = await db.all(query)
    response.send(dbResponse)
 })

  app.post("/register/", async (request, response) => {
    const { username, password, id } = request.body;
    const hashedPassword = await bcrypt.hash(request.body.password, 10);
    const selectUserQuery = `SELECT * FROM register WHERE username like '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      const createUserQuery = `
          INSERT INTO 
            register (username,password, id) 
          VALUES 
            (
              '${username}', 
              '${hashedPassword}',
              '${id}'
            )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.send(`Created new user with ${newUserId}`);
    } else {
      response.status = 400;
      response.ok = false;
      response.send("Username already exists");
    }
  })

  app.get("/register/get/", async (request, response) => {
    const query = `select * from register;`
    const dbResponse= await db.all(query)
    response.send(dbResponse);
  })

  app.post("/login/", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM register WHERE username = '${username}'`;
    const dbUser1 = await db.get(selectUserQuery);
    if (dbUser1 === undefined) {
      response.status(400);
      response.send("Invalid User");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser1.password);
      if (isPasswordMatched === true) {
        const payload = {
          username: username,
        };
        const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid Password");
      }
    }
  });

  app.get("/get/notes/:name/:search", authenticateToken, async(request,response)=>{
     const {name, search}=request.params
     const query=`SELECT * from note where person_username like '${name}' and (title like '%${search}%' or description like '%${search}%');`
     const dbResponse = await db.all(query)
     response.send(dbResponse)
  })

  app.post("/post/note", authenticateToken, async(request,response)=>{
     const {id, title, description, person_username, archieved} = request.body
     const query = `INSERT into note (id, title, description, person_username, archieved) 
                    values ('${id}', '${title}', '${description}', '${person_username}', '${archieved}');`
    const dbResponse = await db.run(query)
    const newNoteId = dbResponse.lastID;
    response.send(`Created new note with ${newNoteId}`);
  } )

  app.get("/get/distinct/:name", authenticateToken, async(request,response)=>{
    const {name}=request.params
    const query=`SELECT label_name from label where person_name like '${name}';`
    const dbResponse = await db.all(query)
    response.send(dbResponse)
 })

  app.delete("/delete/note/:id", authenticateToken, async(request,response)=>{
    const {id}=request.params
    const query=`DELETE from note where id like '${id}';`
    const dbResponse = await db.run(query)
    response.send("Note deleted Successfully");
  })

  app.get("/get/everylabel", authenticateToken, async(request,response)=>{
    
    const query=`SELECT * from label;`
    const dbResponse = await db.all(query)
    response.send(dbResponse)
 })

  app.post("/post/deleted_note", authenticateToken, async(request,response)=>{
    const {id, title, description, person_username, archieved, date_of_delete} = request.body
    const query = `INSERT into deleted_note (id, title, description, person_username, archieved, date_of_delete) 
                   values ('${id}', '${title}', '${description}', '${person_username}', '${archieved}', '${date_of_delete}');`
   const dbResponse = await db.run(query)
   const newNoteId = dbResponse.lastID;
   response.send(`Created new deleted note with ${newNoteId}`);
 })

 app.get("/get/deleted_notes/:name", authenticateToken, async(request,response)=>{
    const {name}=request.params
    const query=`SELECT * from deleted_note where person_username like '${name}';`
    const dbResponse = await db.all(query)
    response.send(dbResponse)
 })

 app.put("/archieve/note/:id/:bool",authenticateToken, async(request,response)=>{
    const {id,bool}=request.params
    const query=`UPDATE note set archieved = ${bool} where id like '${id}';`
    const dbResponse = await db.all(query)
    response.send("Archieved Successfully")
 })

 app.get("/get/notes/:name/:search", authenticateToken, async(request,response)=>{
    const {name, search}=request.params
    const x=search.length
    const query=`SELECT * from note where person_username like '${name}' and (title like '%${search}%' or description like '%${search}%' or "${x}" like "0" or ${search} is null);`
    const dbResponse = await db.all(query)
    response.send(dbResponse)
 })

 app.post("/post/label", authenticateToken, async(request,response)=>{
    const {id_note, id_label, label_name, person_name} = request.body
    const query = `INSERT into label (id_note, id_label, label_name, person_name) 
                   values ('${id_note}', '${id_label}', '${label_name}', '${person_name}');`
   const dbResponse = await db.run(query)
   const newNoteId = dbResponse.lastID;
   response.send(`Created new label with ${newNoteId}`);
 })

 app.get("/get/label/:id", authenticateToken, async(request,response)=>{
    const {id}=request.params
    const query=`SELECT * from label where id_note like '${id}';`
    const dbResponse = await db.all(query)
    response.send(dbResponse)
 })

 app.delete("/delete/label/:id_label", authenticateToken, async(request,response)=>{
    const {id_label}=request.params
    const query=`DELETE from label where id_label like '${id_label}';`
    const dbResponse = await db.run(query)
    response.send("Label deleted Successfully");
  })

  app.get("/get/detailLabel/:username/:label_name", authenticateToken, async(request,response)=>{
    const {username, label_name}=request.params
    const query=`SELECT * from note where id in (select id_note from label where label_name like '${label_name}' and person_name like '${username}');`
    const dbResponse = await db.all(query)
    response.send(dbResponse)
 })

 

 


