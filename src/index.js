import * as path from 'path'

import cors from 'cors'
import express from 'express'
import fs from 'fs'
import fsExtra from 'fs-extra'
import multer from 'multer'
import { optimize } from 'svgo'
import { png2svg } from 'svg-png-converter'
import svgtofont from 'svgtofont'

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
    callback(null, file.originalname + '-')
  },
})

const uploadSvg = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype == 'image/svg+xml') {
      cb(null, true)
    } else {
      cb(null, false)
      return cb(new Error('Only .svg format allowed!'))
    }
  },
})

const uploadPng = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype == 'image/png') {
      cb(null, true)
    } else {
      cb(null, false)
      return cb(new Error('Only .png format allowed!'))
    }
  },
})

app.post('/svg', uploadSvg.array('files'), async (req, res) => {
  try {
    var char = 'a'
    var num = 1
    const filePath = req.files[0].destination
    const files = fs
      .readdirSync(filePath)
      .sort((n1, n2) => Number(n1.split('.')[0]) - Number(n2.split('.')[0]))

    for (const file of files) {
      if (num === 9) {
        char = nextChar(char)
        num = 1
      }
      fs.renameSync(`${filePath}/${file}`, `${filePath}/${char + num}.svg`)
      num = num + 1
    }
    const fontName = `font-${Date.now()}`
    await svgtofont({
      src: path.resolve(process.cwd(), req.files[0].destination), // svg path
      dist: path.resolve(
        process.cwd(),
        `./public/fonts/${req.files[0].destination.split('/')[3]}`
      ), // output path
      emptyDist: true,
      startUnicode: 0x0020,
      fontName: fontName,
      css: false,
    })

    const file = `./public/fonts/${
      req.files[0].destination.split('/')[3]
    }/${fontName}.ttf`
    res.download(file, `${uniqueSuffix}.ttf`, function (err) {
      fsExtra.emptyDirSync('./public')
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({
      message: 'Something went wrong',
    })
  }
})

app.post('/png', uploadPng.array('files'), async (req, res) => {
  try {
    const filePath = req.files[0].destination
    const dicFolder = `./public/svg/${req.files[0].destination.split('/')[3]}`
    var char = 'a'
    var num = 1
    fs.mkdirSync(dicFolder, { recursive: true })
    const files = fs
      .readdirSync(filePath)
      .sort((n1, n2) => Number(n1.split('.')[0]) - Number(n2.split('.')[0]))

    for (const file of files) {
      let outputBuffer = await png2svg({
        input: fs.readFileSync(`${filePath}/${file}`),
        tracer: 'imagetracer',
        optimize: true,
        noCurveOptimization: true,
      })

      const result = await optimize(outputBuffer.content, {
        path: `${dicFolder}/${file.split('.')[0]}.svg`,
        multipass: true,
        plugins: [
          'removeDoctype',
          'removeXMLProcInst',
          'removeComments',
          'removeMetadata',
          'removeEditorsNSData',
          'cleanupAttrs',
          'mergeStyles',
          'inlineStyles',
          'minifyStyles',
          'cleanupIDs',
          'removeUselessDefs',
          'cleanupNumericValues',
          'convertColors',
          'removeUnknownsAndDefaults',
          'removeNonInheritableGroupAttrs',
          'removeUselessStrokeAndFill',
          'removeViewBox',
          'cleanupEnableBackground',
          'removeHiddenElems',
          'removeEmptyText',
          'convertShapeToPath',
          'convertEllipseToCircle',
          'moveElemsAttrsToGroup',
          'moveGroupAttrsToElems',
          'collapseGroups',
          'convertPathData',
          'convertTransform',
          'removeEmptyAttrs',
          'removeEmptyContainers',
          'mergePaths',
          'removeUnusedNS',
          'sortDefsChildren',
          'removeTitle',
          'removeDesc',
        ],
      })

      if (num === 9) {
        char = nextChar(char)
        num = 1
      }
      fs.writeFileSync(`${dicFolder}/${char + num}.svg`, result.data)
      num = num + 1
    }
    const fontName = `font-${Date.now()}`
    await svgtofont({
      src: path.resolve(process.cwd(), dicFolder),
      dist: path.resolve(
        process.cwd(),
        `./public/fonts/${req.files[0].destination.split('/')[3]}`
      ),
      emptyDist: true,
      startUnicode: 0x0020,
      fontName: fontName,
      css: false,
    })
    const file = `./public/fonts/${
      req.files[0].destination.split('/')[3]
    }/${fontName}.ttf`
    res.download(file, `${uniqueSuffix}.ttf`, function (err) {
      fsExtra.emptyDirSync('./public')
    })
  } catch (e) {
    res.status(500).json({
      message: 'Something went wrong',
    })
  }
})
function nextChar(c) {
  return String.fromCharCode(c.charCodeAt(0) + 1)
}

app.listen(3000)
