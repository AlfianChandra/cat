import express from 'express'
import { getParticipant, addParticipant, deleteParticipant, updateParticipant, optinParticipant, optoutParticipant } from '../controllers/participant.controller.js'
import {webmasterOnly, userOnly} from '../middlewares/restrictions.middleware.js'
const router = express.Router()

router.post("/create", webmasterOnly, addParticipant)
router.post("/delete", webmasterOnly, deleteParticipant)
router.post("/update", webmasterOnly, updateParticipant)
router.post("/get", webmasterOnly, getParticipant)
router.post("/optin", webmasterOnly, optinParticipant)
router.post("/optout", webmasterOnly, optoutParticipant)
export default router