//User model
import { User } from '../models/user.model.js'
import { Participant } from '../models/participant.model.js'
import { Instance } from '../models/instance.model.js'
import {Test} from '../models/test.model.js'

export const getUserActiveSession = async (req, res) => { 
  try {
    const userId = req.user.id; 
    const user = await User.findById(userId)
    if (!user) { 
      return res.status(404).json({status:404, message:"User not found"})
    }

    const idParticipant = user.id_participant
    if(!idParticipant) { 
      return res.status(404).json({status:404, message:"User is not a participant"})
    }

    const participant = await Participant.findById(idParticipant)
    if (!participant) {
      return res.status(404).json({status:404, message:"Participant not found"})
    }

    const idInstansi = participant.id_instansi
    const instance = await Instance.findById(idInstansi)
    if (!instance) {
      return res.status(404).json({status:404, message:"Instance not found"})
    }

    // Get tests
    const tests = await Test.find()
    if (!tests) { 
      return res.status(404).json({status:404, message:"Tests not found"})
    }

    let activeTest = []
    tests.forEach((test) => { 
      console.log(test.name, instance._id)
      const instances = test.instances
      if (instances.length > 0) { 
        instances.forEach((inst) => { 
          console.log(inst)
          if (inst._id === instance._id.toString()) {
            activeTest.push(test)
          }
        })
      }
    })
    
    return res.status(200).json({
      status: 200,
      message: "ok",
      data: activeTest
    })
  } catch (error) { 
    console.error("Error in getUserActiveSession: ", error);
    return res.status(500).json({status:500, message:error})
  }
}

export const getUserData = async (req, res) => { 
  try {
    const { id } = req.body;
    let users = {}
    const user = await User.findById(id).select("-password -role -google_avatar -createdAt -google_signin")
    if (!user) { 
      return res.status(404).json({status:404, message:"User not found"})
    }

    users.profile = user

    const idParticipant = user.id_participant

    //exclude password_string and username_string
    const participant = await Participant.findById(idParticipant).select('-password_string -username_string')
    if (participant) { 
      users.is_participant = true
      const idInstansi = participant.id_instansi
      const instansi = await Instance.findById(idInstansi)
      if (instansi) {
        users.participant_instance = instansi
      }
      else { 
        users.participant_instance = null
      }

      users.participant_data = participant
    } else {
      users.is_participant = false
      users.participant_data = null
    }
    
    return res.status(200).json({status:200, message:"ok", data:users})
  } catch (error) { 
    return res.status(500).json({status:500, message:error})
  }
}