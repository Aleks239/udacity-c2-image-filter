import express from 'express';
import fs from "fs";
import {Request, Response} from "express";
import bodyParser from 'body-parser';
import { spawn } from 'child_process';
import https from "https";
import validator from "validator";
(async () => {

  const app = express();
  const port = 8082; // default port to listen
  const getImageName = (url:string) => {
    let pictures = url.split("/").filter((d) => {
      return d.includes(".jpg") || d.includes(".jpeg") || d.includes(".png"); 
    })
    if(pictures.length !== 1){
      throw new Error("No image in the URL");
    }
    else if(pictures[0].includes("?")){
       pictures = pictures[0].split("?")
    }
    return pictures[0];
  }
  
  app.use(bodyParser.json());
  
  //VERY BAD
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  app.post("/filterimage", async (req: Request, res: Response) => {
    const {image_url, upload_image_signedUrl} = req.body;
    let fileName = "";
    try{
       fileName = getImageName(image_url);       
    }catch(e){
      return res.send(e.message).status(422);
    }
    
    const localPath = `/mock/${fileName}`
    const processedPath = `/out/${fileName}`
    if(!image_url){
      return res.send(`image_url must be provided`).status(422);
    }
    if(!validator.isURL(image_url)){
      res.send(`image_url is not a valid URL`)
    }

    if(upload_image_signedUrl !== undefined){
      if(!validator.isURL(upload_image_signedUrl)){
        return res.send(`upload_image_signedUrl is not a valid URL`)
      }
    }

    const file = fs.createWriteStream(__dirname + localPath);
    const request = https.get(image_url, function(response) {
        response.pipe(file)
        response.on("end", () => {
          const pythonProcess = spawn('python3', ["src/image_filter.py", `${fileName}`]);
          if(pythonProcess !== undefined) {
              pythonProcess.stdout.on('data', (data) => {
              const check = data.toString().split("\n");  
              if(check[0] === "True" && check[1] === "Success"){
                if(upload_image_signedUrl){
                  return res.sendFile(`${__dirname}/${processedPath}`);
                }
                return res.send("File successfully processed").status(200);
              }
              res.send("Failed to process image").status(422);
              
      });
    }
        })

  })
    
  })

  // Root URI call
  app.get( "/", async ( req, res ) => {
    const pythonProcess = spawn('python3', ["src/image_filter.py"]);
    if(pythonProcess !== undefined) {
      pythonProcess.stdout.on('data', (data) => {
        // Do something with the data returned from python script
        console.log(data.toString())
      });
    }

    res.send( "pythonic" );
  } );
  

  // Start the Server
  app.listen( port, () => {
      console.log( `server running http://localhost:${ port }` );
      console.log( `press CTRL+C to stop server` );
  } );
})();