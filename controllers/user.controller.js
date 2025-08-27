import { User } from "../models/user.model.js"
import path from 'path'
import bcrypt from 'bcrypt';
import sharp from 'sharp'
import time from "../utils/timeHelper.js"
import moment from "moment-timezone";
import fs from 'fs'
import { PhoneVerify } from "../models/phoneverifys.model.js"

export const getUsers = async (req, res) => { 
  try {
    const { search_key } = req.body

    //Where role is webmaster
    const users = await User.find({
      $or: [
        { name: { $regex: search_key, $options: 'i' } },
        { email: { $regex: search_key, $options: 'i' } },
        { phone: { $regex: search_key, $options: 'i' } },
      ],
      role: 'webmaster'
    })

    if (users.length === 0) {
      return res.status(404).json({ status: 404, message: 'Tidak ada pengguna yang ditemukan' })
    }

    //Exclude password and role from the response
    const usersWithoutSensitiveData = users.map(user => {
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
      }
    })
    return res.status(200).json({ status: 200, data: usersWithoutSensitiveData })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ status: 500, message: 'Terjadi kesalahan' })
  }
}

export const createUserAccount = async (req, res) => { 
  try {
    const { name, email, password, dob, phone } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ status: 400, message: 'Semua bidang wajib diisi' })
    }

    if (password.length < 8) {
      return res.status(400).json({ status: 400, message: 'Sandi harus memiliki minimal 8 karakter' })
    }

    const existingEmail = await User.findOne({ email: email })
    if (existingEmail) {
      return res.status(400).json({ status: 400, message: 'Email sudah terdaftar. Gunakan email lain' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new User({
      name: name,
      email: email,
      password: hashedPassword,
      dob: dob,
      phone: phone,
      role: 'webmaster',
    })
    await newUser.save()
    //return
    return res.status(200).json({ status: 200, message: 'Akun pengguna berhasil dibuat!' })
  } catch (error) {
    console.error('Error creating user account:', error)
    return res.status(500).json({ status: 500, message: 'Terjadi kesalahan' })
  }
}

export const sendOtp = async (req, res) => {
  try { 
    const userId = req.user.id
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found' })
    }
    const phone = user.phone
    //Clear user's phone verify
    await PhoneVerify.deleteMany({ userId: userId })
    //Create new phone verify
    const newVerify = new PhoneVerify({
      userId: userId,
      phone: phone,
      verified: false,
      code: Math.floor(100000 + Math.random() * 900000),
      timestamp: time.convertToUtc(time.getCurrentTIme())
    })
    await newVerify.save()
    return res.status(200).json({ status: 200, message: 'OTP dikirim!' })
  }catch(error) {
    console.error('Error sending OTP:', error)
    return res.status(500).json({ status: 500, message: 'Terjadi kesalahan' })
  }
}

export const getPhoneState = async (req, res) => {
  try {
    const userId = req.user.id
    //Exclude code and timestamp from the response
    const phoneState = await PhoneVerify.findOne({ userId: userId })
    if (!phoneState) {
      return res.status(404).json({ status: 404, message: 'Nomor telepon tidak ditemukan' })
    }

    return res.status(200).json({
      status: 200,
      state: phoneState.verified,
    })

  } catch (error) {
    console.error('Error fetching phone state:', error)
    return res.status(500).json({ status: 500, message: 'Terjadi kesalahan' })
  }
}

export const updatePassword = async (req, res) => {
  try {
    const userId = req.user.id
    const { oldPass, newPass } = req.body
    
    // Validate input data
    if (!oldPass || !newPass) {
      return res.status(400).json({ status: 400, message: 'Semua bidang wajib diisi' })
    }

    if (newPass.length < 8) {
      return res.status(400).json({ status: 400, message: 'Sandi baru harus memiliki minimal 8 karakter' })
    }

    if(oldPass === newPass) {
      return res.status(400).json({ status: 400, message: 'Sandi baru tidak boleh sama dengan Sandi lama' })
    }

    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ status: 404, message: 'Terjadi kesalahan' })
    }

    // Check if old password is correct
    const isMatch = await bcrypt.compare(oldPass, user.password)
    if (!isMatch) {
      return res.status(400).json({ status: 400, message: 'Sandi lama salah' })
    }

    // Hash new password
    const hashedNewPass = await bcrypt.hash(newPass, 10)

    // Update password
    user.password = hashedNewPass
    await user.save()
    return res.status(200).json({ status: 200, message: 'Sandi berhasil diperbarui!' })
  } catch (error) {
    console.error('Error updating password:', error)
    return res.status(500).json({ status: 500, message: 'Terjadi kesalahan' })
  }
}

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id
    const { name, email, dob, phone } = req.body

    // Validate input data
    if (!name || !email || !dob) {
      return res.status(400).json({ status: 400, message: 'Semua bidang wajib diisi' })
    }

    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ status: 404, message: 'Terjadi kesalahan' })
    }

    //check for duplicate phone, check other's phone only, dont check self phone
    const existingPhone = await User.find({ phone: phone, _id: { $ne: userId } })
    if (existingPhone.length > 0) {
      return res.status(400).json({ status: 400, message: 'Nomor telepon sudah terdaftar. Gunakan nomor lain' })
    }

    // Update user profile
    const currentPhone = user.phone
    user.name = name
    user.dob = dob

    if (phone !== currentPhone) {
      user.phone = phone
      //Delete all user's phone verify
      await PhoneVerify.deleteMany({ userId: userId })
      const newVerify = new PhoneVerify({
        userId: userId,
        phone: phone,
        verified: false,
        code: Math.floor(100000 + Math.random() * 900000),
        timestamp: moment.tz("Asia/Jakarta").toDate()
      })
      await newVerify.save()
    }

    await user.save()
    return res.status(200).json({ status: 200, message: 'Profil berhasil diperbarui!' })
  } catch (error) {
    console.error('Error updating profile:', error)
    return res.status(500).json({ status: 500, message: 'Terjadi kesalahan '+error.message })
  }
}

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 400, message: 'No file uploaded' })
    }

    const userId = req.user.id
    //Check user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ status: 404, message: 'User not found' })
    }

    //Check existing avatar
    if (user.avatar) { 
      const existingAvatarPath = path.resolve('usercontent/avatars'+user.avatar)
      if (fs.existsSync(existingAvatarPath)) { 
        fs.unlinkSync(existingAvatarPath)
      }
    }

    const uploadsDir = path.resolve('usercontent/avatars')
    if (!fs.existsSync(uploadsDir)) { 
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const timestamp = Date.now()
    const filename = `avatar_${timestamp}.webp`
    const filePath = path.join(uploadsDir, filename)
    await sharp(req.file.buffer)
      .resize(300, 300, { fit: 'cover' })
      .webp({ quality: 100 })
      .toFile(filePath)
    const fileUrl = `/${filename}`
    user.avatar = fileUrl
    await user.save()
    return res.status(200).json({ status: 200, message: 'ok', fileUrl: fileUrl })
  } catch (error) { 
    console.error('Error uploading avatar:', error)
    return res.status(500).json({ status: 500, message: 'Internal server error' })
  }
}

export const getProfile = async (req, res) => {
  try {
    const userid = req.user.id
    console.log('userid', userid)
    const getUser = await User.findById(userid).select('-password')
    if (!getUser) {
      return res.status(404).json({ status: 404, message: 'User not found' })
    }
    return res.status(200).json({ status: 200, message: 'ok', profile: getUser })
  }catch (error) {
    console.error('Error fetching user profile:', error)
    return res.status(500).json({ status: 500, message: 'Internal server error' })
  }
}
