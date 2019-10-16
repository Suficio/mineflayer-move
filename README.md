# mineflayer-move

Promise based movement library for Mineflayer found under: [https://github.com/superjoe30/mineflayer/](https://github.com/superjoe30/mineflayer/)

## Table of Contents
- [Mineflayer-Move](#mineflayer-move)
    - [Table of Contents](#table-of-contents)
    - [Features](#features)
    - [Basic Usage](#basic-usage)
    - [Advanced Usage](#advanced-usage)
    - [Documentation](#documentation)
        - [bot.move.to](#botmoveto-desiredpoint--forceenum)
        - [bot.move.along](#botmovealong-path)
        - [bot.pathfinder.lookTowards](#botpathfinderlooktowards-position)
        - [bot.pathfinder.MONITOR_INTERVAL](#botpathfindermonitor_interval-position)
        - [bot.pathfinder.TIMEOUT](#botpathfindertimeout)
        - [bot.pathfinder.BLOCK_RADIUS](#botpathfinderblock_radius)
        - [bot.pathfinder.JUMP_RADIUS](#botpathfinderjump_radius)
        - [bot.pathfinder.ENUMMove](#botpathfinderenummove)
        - [bot.pathfinder.ENUMStatus](#botpathfinderenumstatus)

## Features

* Provides high level API for moving bot between two points
* Uses a promise based API

## Basic Usage

Firstly, install:
```
    npm install --save cheezbarger/mineflayer-move
```

To get started just paste this code into your bot:
```js
const mineflayer = require('mineflayer');
const move = require('mineflayer-move');

// Install move
move(bot);

bot.on('chat', function(username, message)
{
    // Move to whoever talked
    if (message === 'come')
    {
        bot.move
            .to(bot.players[username].entity.position)
            .then(function(ENUMState)
            {
                bot.chat("I've arrived!");
            });
    }
}
```

## Advanced Usage

The following code illustrates how this library might be used in conjunction with other pathfinding libraries.
```js
const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder');
const move = require('mineflayer-move');

// Install move and pathfinder
pathfinder(bot);
move(bot);

bot.on('chat', function(username, message)
{
    if (message === 'come')
    {
        bot.pathfinder.to(
            bot.entity.position.floored(),
            bot.players[username].entity.position.floored()
        )
            .then(function(returnState)
            {
                bot.move.along(returnState.path)
                    .then(function(moveReturn)
                    {
                        if (moveReturn === bot.move.ENUMStatus.Arrived)
                            bot.chat('I\'ve arrived!');
                        else
                            bot.chat('Something went wrong');
                    });
            });
    }
});
```

```js
const pathfinder = require('mineflayer-navigate')(mineflayer);

// Install move and pathfinder
navigate(bot);

bot.on('chat', function(username, message)
{
    if (message === 'come')
    {
        const returnState = bot.navigate.findPathSync(bot.players[username].entity.position);

        bot.move.along(returnState.path.reverse())
            .then(function(moveReturn)
            {
                if (moveReturn === bot.move.ENUMStatus.Arrived)
                    bot.chat('I\'ve arrived!');
                else
                    bot.chat('Something went wrong');
            });
    }
});
```

## Documentation

### bot.move.to( desiredPoint [, forceENUM])
Moves the bot towards the desired point. The bot will not check whether it can actually move to that point.

* `desiredPoint` - the point to which the bot will attempt to move
* `forceENUM` - one of `bot.move.ENUMMove`, forces bot to use the provided movement type

Returns a promise which resolves or rejects with the corresponding `bot.move.ENUMStatus`.

### bot.move.along( path)
Moves the bot along the provided path. Will use `path.pop` and `path.peek` to navigate along path.

`path` - array of coordinates through which to move

Returns a promise which resolves when the entire path has been traversed, or rejects with the corresponding `bot.move.ENUMStatus`.

### bot.pathfinder.lookTowards( position)
Functionally simillar to `bot.lookAt` except the bot does not look at its feet.

`position` - coordinates of the position you want to look towards

### bot.pathfinder.MONITOR_INTERVAL
Integer value which determines how often, in millisecodns, the bots position is checked, defaults to 40.

### bot.pathfinder.TIMEOUT
Integer value which determines after what time the bot gives up trying to move, defaults to 2600.

### bot.pathfinder.BLOCK_RADIUS
Float value which determines the distance from the center of a block to which the bot will attempt to move to, defaults to 0.14.

### bot.pathfinder.JUMP_RADIUS
Float value which determines the distance from the center of a block at which the bot will jump, defaults to 0.82.

### bot.pathfinder.ENUMMove
Object with the following properties:
* `Walk` - refers to a movement type which only attempts to walk towards the goal
* `Hop` - refers to a movement type which jumps towards the goal
* `Jump` - referes to a movement type which sprint jumps towards the goal

### bot.pathfinder.ENUMStatus
Object with the following properties:
* `Arrived` - occurs when the bot successfully moved to the goal
* `Failed` - occurs when the bot could not move to the goal \[Not implemented]
* `Timeout` - occurs when the bot timed out while moving to the goal
