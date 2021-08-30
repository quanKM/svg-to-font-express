import express from 'express'
import multer from 'multer'
import cors from 'cors'
import fs from 'fs'
import * as path from 'path'
import svgtofont from 'svgtofont'
import fsExtra from 'fs-extra'
import { svg2png } from 'svg-png-converter'
import archiver from 'archiver'
const app = express()
import AdmZip from 'adm-zip'
app.use(cors())
app.use(express.static('public/fonts'))

const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const path = `./public/uploads/${uniqueSuffix}`
    fs.mkdirSync(path, { recursive: true })
    return cb(null, path)
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname)
  },
})
const upload = multer({ storage: storage })

app.post('/', upload.array('files'), async (req, res) => {
  await svgtofont({
    src: path.resolve(process.cwd(), req.files[0].destination), // svg path
    dist: path.resolve(
      process.cwd(),
      `./public/fonts/${req.files[0].destination.split('/')[3]}`
    ), // output path
    emptyDist: true,
    startUnicode: 0x0061,
    fontName: 'font',
    css: false,
  })
  const file = `./public/fonts/${
    req.files[0].destination.split('/')[3]
  }/font.ttf`
  res.download(file, 'font.ttf', function (err) {
    fsExtra.emptyDirSync('./public')
  })
})

app.post('/png', upload.array('files'), async (req, res) => {
  const filePath = req.files[0].destination
  const dicFolder = `./public/png/${req.files[0].destination.split('/')[3]}`

  fs.mkdirSync(dicFolder, { recursive: true })
  try {
    const files = await fs.promises.readdir(filePath)
    for (const file of files) {
      let outputBuffer = await svg2png({
        input: fs.readFileSync(`${filePath}/${file}`),
        encoding: 'buffer',
        format: 'png',
      })

      await fs.promises.writeFile(
        `${dicFolder}/${file.split('.')[0]}.png`,
        outputBuffer
      )
    }

    var zip = new AdmZip()
    zip.addLocalFolder(dicFolder)
    const file_after_download = `${req.files[0].destination.split('/')[3]}.zip`

    const data = zip.toBuffer()
    res.set('Content-Type', 'application/octet-stream')
    res.set(
      'Content-Disposition',
      `attachment; filename=${file_after_download}`
    )
    res.set('Content-Length', data.length)
    fsExtra.emptyDirSync('./public')
    res.send(data)
  } catch (error) {
    console.log(error)
  }
})

app.listen(3000)
