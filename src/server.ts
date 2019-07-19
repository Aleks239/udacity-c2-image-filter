import express from 'express';
import { Request, Response } from "express";
import bodyParser from 'body-parser';
import { spawn } from 'child_process';
import { filterImageFromURL, deleteLocalFiles } from './util/util';
import * as jwt from 'jsonwebtoken';
import {config} from "./config/config";


const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.headers || !req.headers.authorization) {
    return res.status(401).send({ message: 'No authorization headers.' });
  }


  const token_bearer = req.headers.authorization.split(' ');
  if (token_bearer.length != 2) {
    return res.status(401).send({ message: 'Malformed token.' });
  }

  const token = token_bearer[1];

  return jwt.verify(token, config.dev.jwt_secret, (err, decoded) => {
    if (err) {
      return res.status(500).send({ auth: false, message: 'Failed to authenticate.' });
    }
    return next();
  });
}


(async () => {

  const app = express();
  const port = 8082; // default port to listen
  app.use(bodyParser.json());

  //VERY BAD
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  app.post("/filterimage", requireAuth, async (req: Request, res: Response) => {
    const { image_url } = req.body;
    if (!image_url) {
      return res.send(`image_url must be provided`).status(422);
    }
    try {
      let file = await filterImageFromURL(image_url);
      res.on("finish", () => {
        deleteLocalFiles([file])
      })
      const pythonProcess = spawn('python3', ["src/image_filter.py", `${file}`]);
      if (pythonProcess !== undefined) {
        pythonProcess.stdout.on('data', (data) => {
          const check = data.toString().split("\n");
          if (check[0] === "True" && check[1] === "Success") {
            return res.sendFile(`${file}`);
          }
          res.send("Failed to process image").status(422);
        });
      }
    } catch (e) {
      return res.send(e.message).status(422);
    }
  })


  // Root URI call
  app.get("/", async (req, res) => {
    const pythonProcess = spawn('python3', ["src/image_filter.py"]);
    if (pythonProcess !== undefined) {
      pythonProcess.stdout.on('data', (data) => {
        // Do something with the data returned from python script
        console.log(data.toString())
      });
    }
    res.send("pythonic");
  });

  // Start the Server
  app.listen(port, () => {
    console.log(`server running http://localhost:${port}`);
    console.log(`press CTRL+C to stop server`);
  });
})();