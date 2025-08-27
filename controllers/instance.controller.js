import { Instance } from "../models/instance.model.js";
import { Test } from '../models/test.model.js';
import { Participant } from '../models/participant.model.js'
import { User } from '../models/user.model.js';

export const deleteInstance = async (req, res) => {
  const { _id } = req.body;
  const instance = await Instance.findById(_id);
  if (!instance) {
    return res.status(404).json({ status: 404, message: 'Instansi tidak ditemukan' });
  }
  try {
    // Check if there are participants linked to this instance
    const participants = await Participant.find({ id_instansi: _id });
    participants.forEach(async (participant) => {
      const idParticipant = participant._id;
      const participantUser = await User.findOne({ id_participant: idParticipant });
      //Delete user if exists
      if (participantUser) {
        await participantUser.deleteOne();
      }

      //Delete participant
      await participant.deleteOne();
    });

    //Delete instance from test
    const tests = await Test.find({});
    tests.forEach(async (test) => {
      const testInstance = test.instances
      testInstance.forEach(async (inst) => {
        if (inst._id.toString() === _id) {
          test.instances = test.instances.filter(instance => instance._id.toString() !== _id);
          await test.save();
        }
      });
    });

    await instance.deleteOne();
    return res.status(200).json({ status: 200, message: 'Instansi dihapus' });
  } catch (error) {
    console.error('Error deleting instance:', error);
    return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server: '+error.message });
  }
}

export const updateInstance = async (req, res) => { 
  const { name, _id, instance_id, address, jenjang } = req.body;
  const instance = await Instance.findById(_id);
  if (!instance) { 
    return res.status(404).json({ status: 404, message: 'Instansi tidak ditemukan' });
  }

  //Check for existing instance
  const exist = await Instance.findOne({ instance_id: instance_id, _id: { $ne: _id } });
  if (exist) {
    return res.status(400).json({ status: 400, message: 'Instansi dengan ID yang diberikan sudah ada!' });
  }

  //Update instance
  instance.name = name;
  instance.instance_id = instance_id;
  instance.address = address;
  instance.jenjang = jenjang
  try {
    await instance.save();
    return res.status(200).json({ status: 200, message: 'Instansi diperbarui', data: instance });
  } catch (error) {
    console.error('Error updating instance:', error);
    return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' });
  }
}

export const getInstance = async (req, res) => { 
  //Order by name
  try {
    const instances = await Instance.find().sort({ name: 1 });
    return res.status(200).json({ status: 200, message: 'Instansi ditemukan', data: instances });
  } catch (error) {
    console.error('Error fetching instances:', error);
    return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' });
  }
}
export const createInstance = async (req, res) => { 
  const { name, instance_id, address, jenjang } = req.body;
  //Check for existing instance
  const exist = await Instance.findOne({ instance_id: instance_id });
  if(exist) {
    return res.status(400).json({ status: 400, message: 'Instansi sudah ada!' });
  }
  //Create new instance
  const newInstance = new Instance({
    name: name,
    instance_id: instance_id,
    address: address,
    jenjang: jenjang
  });
  try {
    await newInstance.save();
    return res.status(200).json({ status: 200, message: 'Instansi disimpan', data: newInstance });
  } catch (error) {
    console.error('Error creating instance:', error);
    return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server' });
  }
}