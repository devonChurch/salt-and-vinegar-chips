# 👋 What

A GraphQL Server that curates our static `.json` Micro Front-end configuration files into an interactive API.

# 🤷 Why

As our Micro Front-end inventory evolves and grows, our configuration data become richer yet commensurately harder to digest.

💡 _**Below a basic breakdown of our configuration files and their context:**_

## Global Configuration
`ep.global.config.json`

Registers Micro Front-ends and their corresponding environments and dependencies. 

## Builds Configuration
`ep.builds.config.json`

Stores a registry of deployed Micro Front-end builds to a specific environment _(**Test**, **Staging** or **Live**)_.

## Metadata **Configuration**
`ep.metadata.config.json`

A set of data bespoke to a single Micro Front-end build that has been deployed through our CI process.

# 👀 Where

Our exponentially expanding Micro Front-end configuration surface area can be represented with the following scenario.

💡 _**Below a basic breakdown of our configuration files and their relationship to each other:**_

## Hierarchy

![basic configuration hierarchy](https://user-images.githubusercontent.com/15273233/190882837-ab66d195-745c-4cb3-a64e-089550f1f4f3.png)

## Multiple Builds
Each Micro Front-end can "essentially" have an infinite number of builds.

![multiple builds configurations](https://user-images.githubusercontent.com/15273233/190882839-7714b485-70e1-444d-af67-234cddfb02a9.png)

## Multiple Environments
Our configuration data increases dramatically when orchestrating between multiple environments for a single Micro Front-end.

![multiple environments configurations](https://user-images.githubusercontent.com/15273233/190882843-907bb5ef-9b12-4d0f-8e82-2f5d44f684a9.png)

## Multiple Micro Front-ends
The total configuration surface area continues to grow substantially with each new Micro Front-end added to our architecture inventory.

![multiple micro front-ends](https://user-images.githubusercontent.com/15273233/190882847-4b48e085-8422-4a50-8b79-3127792bfe95.png)