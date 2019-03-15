#!/usr/bin/env node

// ------------------------------- NODE MODULES -------------------------------

const fs = require('mz/fs');
const path = require('path');
const program = require('commander');
const shell = require('shelljs');

// ------------------------------ CUSTOM MODULES ------------------------------

// -------------------------------- VARIABLES ---------------------------------

// ----------------------------- FILE DEFINITION ------------------------------

const isFolder = item => item.item !== undefined;

const processFolder = async (folder, outputDirectory) => {
    const dir = path.join(outputDirectory, folder.name);

    shell.mkdir('-p', dir);

    const promises = [];

    folder.item.forEach(item => {
        if (isFolder(item)) {
            promises.push(processFolder(item, dir));
        } else {
            promises.push(fs.writeFile(path.join(dir, `${item.name}.json`), JSON.stringify(item, null, 4)));
        }
    });

    await Promise.all(promises);
};

program
    .command('export <collection>')
    .name('export')
    .description('Export requests from a Postman collection into individual files')
    .option('-o, --output <path>', 'Output directory')
    .action(async (dir, cmd) => {
        let collectionPath = dir;

        if (!path.isAbsolute(dir)) {
            collectionPath = path.join(process.cwd(), dir);
        }

        const collectionExists = await fs.exists(collectionPath);

        if (!collectionExists) {
            console.log(`No collection exists at ${collectionPath}`);
        }

        const collection = JSON.parse(await fs.readFile(collectionPath, 'utf-8'));

        collection.name = collection.info.name;

        const outputDirectory = cmd.output || process.cwd();

        await processFolder(collection, outputDirectory);

        console.log(`Collection successfully exported to ${outputDirectory}`);
    });

program
    .command('import <request> <collection>')
    .name('import')
    .description('Import a Postman request file into a collection')
    .action(async (request, collection) => {
        let requestPath = request;

        if (!path.isAbsolute(request)) {
            requestPath = path.join(process.cwd(), request);
        }

        let collectionPath = collection;

        if (!path.isAbsolute(collection)) {
            collectionPath = path.join(process.cwd(), collection);
        }

        if (!await fs.exists(requestPath)) {
            console.log(`No request exists at ${requestPath}`);
        }

        if (!await fs.exists(collectionPath)) {
            console.log(`No collection exists at ${collectionPath}`);
        }

        const requestObject = JSON.parse(await fs.readFile(requestPath, 'utf-8'));
        const collectionObject = JSON.parse(await fs.readFile(collectionPath, 'utf-8'));

        collectionObject.item.push(requestObject);

        await fs.writeFile(collectionPath, JSON.stringify(collectionObject, null, 4));

        console.log(`Request '${requestObject.name}' successfully imported into Postman collection at ${collectionPath}`);
    });

program.parse(process.argv);
