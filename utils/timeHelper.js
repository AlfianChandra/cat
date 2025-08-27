import moment from "moment-timezone"
const timeHelper = () => { 
  const getCurrentTIme = () => { 
    const tz = "Asia/Jakarta"
    return moment.tz(tz).format('YYYY-MM-DD HH:mm:ss')
  }
  const convertToUtc = (date) => {
    const tz = "Asia/Jakarta"
    return moment.tz(date,tz).toDate()
  }

  const dateIncrement = (date, days) => { 
    const tz = "Asia/Jakarta"
    return moment.tz(date, tz).add(days, 'days').format('YYYY-MM-DD HH:mm:ss')
  }
  return {
    convertToUtc,
    getCurrentTIme,
    dateIncrement
  }
}

const time = timeHelper()
export default time