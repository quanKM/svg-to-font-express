import express from 'express'
import multer from 'multer'
import cors from 'cors'
import fs from 'fs'
import * as path from 'path'
import svgtofont from 'svgtofont'
import fsExtra from 'fs-extra'
import { png2svg } from 'svg-png-converter'

const app = express()
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
  const dicFolder = `./public/svg/${req.files[0].destination.split('/')[3]}`

  fs.mkdirSync(dicFolder, { recursive: true })
  try {
    const files = await fs.promises.readdir(filePath)
    for (const file of files) {
      let outputBuffer = await png2svg({
        input: fs.readFileSync(`${filePath}/${file}`),
        tracer: 'potrace',
        optimize: true,
        numberofcolors: 24,
        pathomit: 1,
      })

      await fs.promises.writeFile(
        `${dicFolder}/${file.split('.')[0]}.svg`,
        outputBuffer.content
      )
    }
    await svgtofont({
      src: path.resolve(process.cwd(), dicFolder),
      dist: path.resolve(
        process.cwd(),
        `./public/fonts/${req.files[0].destination.split('/')[3]}`
      ),
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
  } catch (error) {
    console.log(error)
  }
})

app.listen(3000)
