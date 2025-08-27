import express from 'express'
import { createInstance, getInstance, updateInstance, deleteInstance } from '../controllers/instance.controller.js'
import {webmasterOnly} from '../middlewares/restrictions.middleware.js'
const router = express.Router()

router.post("/create", webmasterOnly, createInstance)
router.get("/get", webmasterOnly, getInstance)
router.post("/update", webmasterOnly, updateInstance)
router.post("/delete", webmasterOnly, deleteInstance)
export default router