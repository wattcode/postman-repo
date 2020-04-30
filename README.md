# postman-repo

A command-line utility to allow for simple management of postman collections in source control.

### Installing

```
npm i --save-dev postman-repo
```

### Usage

| Command                                                | Description                                                    |
|--------------------------------------------------------|----------------------------------------------------------------|
| `npx postman-repo -h`                                  | List available commands                                        |
| `npx postman-repo import <path-to-postman-collection>` | Import an exported collection from postman into source control |
| `npx postman-repo list`                                | List all collections in this repository                        |
| `npx postman-repo build <source-collection>`           | Build a source collection                                      |


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Fork

This is a fork of [https://github.com/cfitz1995/postman-splitter.git](postman-splitter) by Connor Fitzgerald