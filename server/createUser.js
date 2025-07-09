
     require('dotenv').config();
     const mongoose = require('mongoose');
     const bcrypt = require('bcryptjs');
     const User = require('./models/User');

     mongoose.connect(process.env.MONGODB_URI, {
       useNewUrlParser: true,
       useUnifiedTopology: true,
     });

     const createUser = async () => {
       try {
         const existingUser = await User.findOne({ email: 'test@example.com' });
         if (existingUser) {
           console.log('User already exists');
           mongoose.disconnect();
           return;
         }

         const user = new User({
           email: 'test@example.com',
           password: await bcrypt.hash('password', 10),
           role: 'Admin',
         });
         await user.save();
         console.log('User created successfully');
       } catch (error) {
         console.error('Error creating user:', error);
       } finally {
         mongoose.disconnect();
       }
     };

     createUser();
 