#!/usr/bin/env node
const yaml = require('js-yaml');
const fs  = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const program = require('commander');
const urlify = require('urlify').create({ spaces: '-', toLower: true, trim: true });

const curPath = process.cwd();
let dir;

program.arguments('<file>')
	.action(convert)
	.parse(process.argv);

function convert(file) {
  dir = file.replace(/\.[a-z]+$/, '');
  fs.mkdirSync(path.join(curPath, dir));

  const docs = readDocs(file);
	const unit = docs.shift();
  
  const questions = docs.map((doc, index) => createQuestion(doc, index));
  inquirer.prompt(questions).then(answers => {
    const annotated = docs.map(annotate(answers));
    exportUnit(unit, annotated);
    annotated.forEach(doc => exportPart(doc));
  });  
}

function annotate(answers) {
  return function (doc, index) {
    const meta = {};

    if (doc.count && doc.count > 2) {
      meta.count = doc.count;
      delete doc.count;
    }

    meta.filename = answers[`filename${index}`] !== ''
      ? urlify(answers[`filename${index}`]) + '.yml'
      : typeof doc.questions === 'string'
      ? urlify(doc.questions).substring(0, 20) + '.yml'
      : Math.random().toString(36).substring(7) + '.yml';

    return Object.assign({}, doc, { meta });
  }
}

function createQuestion(doc, index) {
  const sep = '████████████';

  return {
    type: 'input', 
    name: `filename${index}`,
    message : `This is how the question looks:
      ${sep}
      ${doc.questions}
      ${sep}

      What should i name the file?`
  } 
}

function exportPart(doc) {
  const meta = doc.meta;
  const prep = Object.assign({}, doc);
  delete prep.meta;

  if (meta.filename.match(/\.md$/)) {
    fs.writeFileSync(path.join(curPath, dir, meta.filename), prep.text);
  } else if (meta.filename.match(/\.yml$/)) {
    const yml = yaml.safeDump(prep);
    fs.writeFileSync(path.join(curPath, dir, meta.filename), yml);
  }

  return doc; 
}

function exportUnit(unit, docs) {
  docs.unshift(Object.assign({ text: unit.reading }, { meta: { filename: 'reading.md' }}));
  delete unit.reading;

  if (unit.hasOwnProperty('preface')) delete unit.preface;

  const outline = docs.map(part => {
    return Object.keys(part.meta).length === 1 
      ? part.meta.filename 
      : part.meta;
  });

  const yml = yaml.safeDump(Object.assign({}, unit, { outline }));
  fs.writeFileSync(path.join(curPath, dir, '_unit.yml'), yml);
}

function readDocs(file) {
	return yaml.safeLoadAll(
		fs.readFileSync(path.join(curPath, file), 'utf8')
	);
}

