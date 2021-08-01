const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

//Enable bodyParser
var bodyParser = require('body-parser')
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false })) 

//Conncet to MongoDB with mongoose
const mongoose = require('mongoose');
mongoose.connect(process.env.MDB_URI, {useNewUrlParser: true, useUnifiedTopology: true})
.then(()=>{
  console.log("Connected with Database Successfully");
})
.catch(err=>{
  console.log("Error connecting with Database",err);
});


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//Creating Schemmas
const { Schema } = mongoose;

const userSchema = new Schema({
    username:  String,
});

const exerciseSchema = new Schema({
      userid: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
})

//Exporting Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

//Working with Users
//Get Users
app.get('/api/users',(req,res)=>{
  User.find({},(err,data)=>{
    if(err){
       return res.status(500).json('Server Error')
    }
     return res.send(data);
  });
})
//Create User
app.post('/api/users',(req,res)=>{

    //Check if username already exist
     User.findOne({username:req.body.username},(err,data)=>{
      if(err){
           return res.status(500).json('Server Error')
        }
        if(data){
          return res.json('Username already taken');
        }
        else{
            //If does't exist create a new one
          let new_user = new User({
            username: req.body.username,
          });

        new_user.save((err,data)=>{
            if(err){
              return res.status(500).json('Server Error')
              }
            return res.json({
              username: data.username,
              _id: data._id,
            })
          });
        }
      });
})
//Create Exercise
app.use('/api/users/:_id/exercises',(req,res)=>{
    //Check if current id exist in Users
    User.findById(req.params._id,(err,user)=>{
        if(err){
          return res.status(500).json("Server Error");
        }
        if(!user){
          return res.json("Unknown userId");
        }else{
            
            let date = (req.body.date)? req.body.date : new Date().toISOString().substring(0, 10) ;
            date = new Date(date).toDateString();
            //Create Exercise
            let new_exercise = new Exercise({
              userid: user._id,
              description: req.body.description,
              duration: parseInt(req.body.duration),
              date:date,
            });
            //Save exercise
            new_exercise.save((err,data)=>{
              if(err){
                return res.status(500).json({message:"Server Error",err});
              }else{
                let options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
                let dateshow =data.date.toLocaleDateString("en-US", options);
                
                return res.json({
                     _id: user._id,
                    username: user.username,
                    date,
                    duration: data.duration,
                    description: data.description,
                })
              }
            })
        }
    });
})
//GET user's exercise log
app.get('/api/users/:_id/logs',function (req,res){

  User.findById(req.params._id,(err,user)=>{
    if(err){
      return res.status(500).json('Server Error');
    }
    if(!user){
      return res.status(400).json('No user found');
    }

    let from = (req.query.from) ? req.query.from : new Date(0);
    let to = (req.query.to) ? req.query.to : new Date() ;
    let limit = (req.query.limit)?parseInt(req.query.limit):0;

    Exercise.find({userid:req.params._id, 
            date: {
                $gte: from,
                $lte: to
            }},{"description":1, "duration":1, "date":1, "_id":0},(err,exercices)=>{
              if(err){
      return res.status(500).json('Server Error');
    }
      let count = exercices.length;
    return res.json({
      _id: user._id,
      username: user.username,
      count,
      log: exercices,
    });
  }).limit(limit);
  });
  
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
