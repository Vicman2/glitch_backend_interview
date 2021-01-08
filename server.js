const http = require('http')
const path = require('path')
const fs = require("fs")
const express = require('express')
const app = express()
const server = http.createServer(app)
require('express-async-errors')
const cors = require('cors')
const joi = require("joi")
const request = require('request')



// Helper middlewares
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended:false}))

//endPoint
app.post('/api/refactorCsv', (req, res, next) => {
    // Checking if the req is json and parsing it to get an object if it is true
    let payload = req.body instanceof String ? JSON.parse(req.body) : req.body;

    // How our payload is expected to be
    const schema = {
        csv: joi.object({
            url: joi.string().uri().required(),
            select_fields : joi.array().items(joi.string())
        }).required()
    }

    // Validate the payload and throw error of there is an error
    const result = joi.validate(payload, schema)
    if(result.error) throw new CustomError(result.error.message, 400)


    

   
    // Readying the csv file in the url
    request.get(payload.csv.url, (error, apiRes, body) => {

        // If there was an error fetching the csv file throw a custom error
        if(error)  res.status(400).json(response(false, "There was an error fetching the file", null))

        // If the content of the file is not csv, then throw a custom error notifying the user...(No 1 validation)
        if(!(/text\/csv/si).test(apiRes.headers['content-type'])) {
            res.status(400).json(response(false, "The file fetched is not a csv file", null))
        }

        // At this point, the content we have is csv

        // Converting all the the lines in the cvs as items in an array
        const arrayOfAll = body.split(/\r?\n/)

        // Convert the first element which contains the field name as a different array
        const arrayOfFields = arrayOfAll[0].split(",")

        // Remove all the lines that are empty
        const filteredArray = arrayOfAll.filter((row, index) =>{
            return row !== "" && index !== 0
        })

        // converting csv to json(No 2 validation)
        const jsonData = filteredArray.map((row, index) => {
            // Split each row in the in the file with comma, forming an array with it
            const rowArray = row.split(",")
            let rawJson = {}

            // Loop throw each of the filed
            for(let i = 0; i < arrayOfFields.length; i++ ){
                // Check if the field is in the one to be selected and attatch to the rawjson
                if(payload.csv.select_fields){
                    if(payload.csv.select_fields.includes(arrayOfFields[i])){
                        rawJson[arrayOfFields[i]] =rowArray[i]
                    }
                }else{
                    // if the selected_fields is sent as a payload attach all the files in the object and return
                    rawJson[arrayOfFields[i]] =rowArray[i]
                }
            }
            
            return rawJson
        })

        // creating a unique identifier
        const conversion_key = Date.now().toString() +  (Math.random()).toString()
        
        res.status(200).json({
            conversion_key, 
            json: jsonData
        })




    })

//    

})

//Initial home route
app.use('/', (req, res)=> {
    res.status(200).sendFile(path.join(__dirname, './public', 'index.html'))
})

// Error Middleware
app.use((req, res, next) => {
    throw new CustomError("Invalid request", 400)
})
app.use((error, req, res, next) => {
    console.log("An error just occured")
   switch (true) {
        case error instanceof CustomError :
            console.log("There was an error")
            res.status(error.status).json(response(false, error.message, null))
            break;
        case error.name == 'SyntaxError' :
            res.status(400).json(response(false, error.message, null))
            break;
        case error.name == 'CastError' :
            res.status(400).json(response(false, "Invalid ID", null))
            break;
        case error.name == 'ValidationError' :
            res.status(400).json(response(false, error.message, null))
            break;
       default:
           res.status(500).json(response(false, error.message, null))
           break;
   }
})


// assigning port
const port  =process.env.PORT || 7000



server.listen(port, () => {
    console.log(`Listening on port ${port}`)
})

server.on('error', error =>{
    console.log(`Error occured on the server ${error}`)
})


// My customized response
function response(success, message, data){
    return{
        success: success == null ? true: success,
        message: message || null,
        data: data || null,
    }
}

// Custom Error 
class CustomError extends Error{
    constructor(message, status){
        super(message);
        this.name = this.constructor.name;
        this.status = status || 400
    }
}