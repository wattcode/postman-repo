#!/usr/bin/env node

const fs = require('mz/fs');
const path = require('path');
const program = require('commander');
const shell = require('shelljs');

const isFolder = item => item.item !== undefined;

const processFolder = async (folder, outputDirectory) => {
    const dir = path.join(outputDirectory, folder.name);

    shell.mkdir('-p', dir);

    const promises = [];

    folder.item.forEach(item => {

        if (isFolder(item)) {
            promises.push(processFolder(item, dir));
        } else {
            item.event.forEach((script, index) => {
                let jsFileName = `${item.name}.${script.listen}.js`
                var jsFile = fs.createWriteStream(path.join(dir, jsFileName));
                item.event[index].script.exec.forEach(line => {
                    jsFile.write(line);
                    jsFile.write("\n")
                })
                jsFile.end();
                item.event[index].script.exec = path.join(".", jsFileName);
            })
           
            promises.push(fs.writeFile(path.join(dir, `${item.name}.json`), JSON.stringify(item, null, 4)));
        }
    });

    await Promise.all(promises);
};

program
    .command('import <path-to-postman-collection>')
    .name('import')
    .description('Import a Postman collection into source collection')
    .action(async (dir) => {
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

        const outputDirectory = path.resolve("./src");
        const infoOutput = path.join(outputDirectory, collection.name);

        if(!await fs.exists(infoOutput)) {
            await fs.mkdir(infoOutput)
        }

        await fs.writeFile(path.join(infoOutput, "info.json"), JSON.stringify(collection.info, null, 4));
        await processFolder(collection, outputDirectory);

        console.log(`Collection successfully exported to ${outputDirectory}`);
    });

program
    .command('build <source-collection>')
    .name('build')
    .description('Build source collection into Postman collection')
    .action(async (collection) => {
        console.log("Building....")
        let collectionPath = path.join(process.cwd(), "src", collection);
        let outputPath = path.join(process.cwd(), "public");

        if (!await fs.exists(collectionPath)) {
            console.log(`No collection exists at ${collectionPath}`);
        }

        try {

            const result = await new CollectionBuilder()
                .Build(collectionPath);

            await fs.writeFile(`${outputPath}\\${collection}.json`, JSON.stringify(result, null, 4));

        } catch(err) {
            console.log(err)
        }

        console.log(`Successfully build Postman collection ${collection} to folder ${path.join(process.cwd(), "public")}`);
    });

    
program
    .command('list')
    .name('list')
    .description('List all source collections')
    .action(async () => {
        let collections = await fs.readdir("./src");

        for(collection of collections) {
            console.log(collection)
        }
    });

    class CollectionBuilder {
        _matchCondition = ".json";
        _collection = null;
        _currentItem = [];
    
        _search(absoluteBasePath) {
            return new Promise((resolve, reject) => {
                fs.readdir(absoluteBasePath, { withFileTypes: true },  async (err, folders) => {
    
                    if(err) return reject(err);
                    
                    for(let file of folders) {

                        if(file.name === "info.json") {
                            console.log(file.name)
                            this._collection.info = await this.readJSON(path.resolve(absoluteBasePath, file.name))
                            continue;
                        }
    
                        if(file.isDirectory()){
    
                            if(this._currentItem.length > 0) {
                                let newItem = new Item(file.name, true);
                                this._currentItem[this._currentItem.length - 1].AddItem(newItem);
                                this._currentItem.push(newItem);
                            } else {
                                let newItem = new Item(file.name);
                                this._collection.AddItem(newItem);
                                this._currentItem.push(newItem);
                            }
    
                            await this._search(path.join(absoluteBasePath, file.name));
                            this._currentItem.pop();
                        }
                        
                        if(file.name.endsWith(this._matchCondition)){
                            let rawEvent = await this.readJSON(path.resolve(absoluteBasePath, file.name));
                            let hydratedEvent = await this.HydrateWithScripts(rawEvent, path.resolve(absoluteBasePath, file.name));
                            this._currentItem[this._currentItem.length - 1].AddItem(hydratedEvent);
                        }
                        
                    }
    
                    return resolve(this._collection);
                })
            })
        }
    
        async readJSON(filePath) {
            let rawJson = await fs.readFile(filePath);
            return JSON.parse(rawJson);
        }
    
        async ParseScripts(scriptPath) {
            let rawScript = await fs.readFile(scriptPath)
            return rawScript.toString().split("\n");
        }
    
        async HydrateWithScripts(request, filePath) {
        
            for(let scripts of request.event) {
                let { dir } = path.parse(filePath);
                let scriptPath = path.resolve(dir, scripts.script.exec)
                scripts.script.exec = await this.ParseScripts(scriptPath);
            }
    
            return request;
        }
    
        async Build(absoluteBasePath) {
            this._collection = new Collection();
            return await this._search(absoluteBasePath);
        }
    }
    class Collection {
        info = {}
        item = []
        protocolProfileBehavior = {}
        
        AddItem(item) {
            this.item.push(item)
        }
    }
    
    class Item {
        constructor(name, isSubFolder = false) {
            this.name = name
            this._postman_isSubFolder = isSubFolder
            this.item = []
            this.protocolProfileBehavior = {}
        }
    
        AddItem(item) {
            this.item.push(item);
        }
    
        AddEvent(event) {
            this.item.push(event);
        }
    }


program.parse(process.argv);
