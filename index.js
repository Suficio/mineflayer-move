'use strict';
const Vec3 = require('vec3');

const EPSILON = 0.06;

module.exports = function(bot)
{
    bot.move = {};

    bot.move.ENUMMove = {Walk: 0, Hop: 1, Jump: 2};
    bot.move.ENUMStatus = {Arrived: 0, Failed: 1, Timeout: 2};

    bot.move.MONITOR_INTERVAL = 40;
    bot.move.TIMEOUT = 2600;
    bot.move.BLOCK_RADIUS = 0.14;
    bot.move.JUMP_RADIUS = 0.82;

    bot.move.lookTowards = function(p)
    {
        bot.lookAt(new Vec3(p.x, bot.entity.position.y + bot.entity.height - 0.2, p.z));
    };

    // WARNING!: Bot will attempt to move to any block specified in one move, therefore ensure that it is possible to move to that block.
    bot.move.to = function(blockPosition)
    {
        if (blockPosition === undefined) return Promise.reject(bot.move.ENUMStatus.Arrived);

        const p = blockPosition.floored().add(new Vec3(0.5, 0, 0.5));
        const bp = bot.entity.position.floored().add(new Vec3(0.5, 0, 0.5));

        const horizDelta = p.horizontalDistance(bp);
        const vertDelta = p.y - bp.y;

        if (p.distanceTo(bp) > 6)
            console.warn('WARNING Move: Bot will probably not be able to move to this in one move, could lead to unexpected behaivor.');

        let MODE = bot.move.ENUMMove.Walk;
        if ((horizDelta > 1 && vertDelta >= 0) || (horizDelta === 1 && vertDelta === 1)) MODE = bot.move.ENUMMove.Hop;
        if (horizDelta > 2 || (horizDelta > 2 && vertDelta > 0)) MODE = bot.move.ENUMMove.Jump;

        const MovePromise = modalTraversal[MODE](p, bp);
        MovePromise.catch(function(ENUMStatus)
        {
            console.error(
                'WARNING Move: Move encountered following error:',
                Object.keys(bot.move.ENUMStatus).find(function(key) {return bot.move.ENUMStatus[key] === ENUMStatus;})
            );
        });

        return MovePromise;
    };

    bot.move.along = function(path)
    {
        const GlobalMovePromise = new Promise(function(resolve, reject)
        {
            if (path instanceof Array)
            {
                path = path.slice(0); // Copies to avoid modifying
                path.peek = function() {return this[0];};
            }

            function moveAlong()
            {
                if (path.peek() !== undefined)
                {
                    const MovePromise = bot.move.to(path.pop());
                    MovePromise
                        .then(moveAlong)
                        .catch(function(ENUMStatus)
                        {
                            if (ENUMStatus === bot.move.ENUMStatus.Timeout)
                                console.warn('WARNING Move: Bot move experienced timeout and did not reach goal.');

                            else if (ENUMStatus === bot.move.ENUMStatus.Failed)
                                console.warn('WARNING Move: Bot move experienced failure and did not reach goal.');

                            resolve(ENUMStatus);
                        });
                }
                else
                    resolve(bot.move.ENUMStatus.Arrived);
            }
            moveAlong();
        }).catch(function(e) {console.error('ERROR Move:', e);});

        return GlobalMovePromise;
    };

    // Traversal functions

    const modalTraversal =
    [
        modalTraversal0,
        modalTraversal1,
        modalTraversal2,
    ];

    function modalTraversal0(p, sprint = false)
    {
        const MovePromise = new Promise(function(resolve, reject)
        {
            const startTime = Date.now();
            const mI = setInterval(
                function()
                {
                    bot.move.lookTowards(p);
                    bot.setControlState('forward', true);
                    if (sprint) bot.setControlState('sprint', true);

                    if (bot.entity.position.horizontalDistance(p) < bot.move.BLOCK_RADIUS)
                    {
                        bot.clearControlStates();
                        // Should the bot be falling, this ensures that it safetly lands before continuing.
                        if (Math.abs(bot.entity.position.y - p.y) < EPSILON)
                        {
                            clearInterval(mI);
                            resolve(bot.move.ENUMStatus.Arrived);
                        }
                    }

                    if (Date.now() - startTime > bot.move.TIMEOUT)
                    {
                        bot.clearControlStates();
                        clearInterval(mI);
                        reject(bot.move.ENUMStatus.Timeout);
                    }
                },
                bot.move.MONITOR_INTERVAL
            );
        });

        return MovePromise;
    }

    function modalTraversal1(p, bp)
    {
        const MovePromise = new Promise(function(resolve, reject)
        {
            const startTime = Date.now();
            const mI = setInterval(
                function()
                {
                    bot.move.lookTowards(p);
                    bot.setControlState('forward', true);

                    if (bot.entity.position.horizontalDistance(bp) >= 0)
                        bot.setControlState('jump', true);

                    // Additional value makes sure the bot stops jumping on time, any offet from block center will be later corrected
                    if (bot.entity.position.horizontalDistance(p) < bot.move.BLOCK_RADIUS)
                    {
                        bot.clearControlStates();
                        // Should the bot be falling, this ensures that it safetly lands before continuing.
                        if (Math.abs(bot.entity.position.y - p.y) < EPSILON)
                        {
                            clearInterval(mI);
                            // Ensures that the bot is centered on the block.
                            if (bot.entity.position.horizontalDistance(p) > bot.move.BLOCK_RADIUS)
                            {
                                modalTraversal0(p)
                                    .then(function(ENUMStatus) {resolve(ENUMStatus);})
                                    .catch(function(ENUMStatus) {reject(ENUMStatus);});
                            }
                            else resolve(bot.move.ENUMStatus.Arrived);
                        }
                    }

                    if (Date.now() - startTime > bot.move.TIMEOUT)
                    {
                        bot.clearControlStates();
                        clearInterval(mI);
                        reject(bot.move.ENUMStatus.Timeout);
                    }
                },
                bot.move.MONITOR_INTERVAL
            );
        });

        return MovePromise;
    }

    function modalTraversal2(p, bp)
    {
        const MovePromise = new Promise(function(resolve, reject)
        {
            const startTime = Date.now();
            const mI = setInterval(
                function()
                {
                    bot.move.lookTowards(p);
                    bot.setControlState('forward', true);
                    bot.setControlState('sprint', true);

                    if (bot.entity.position.horizontalDistance(bp) > bot.move.JUMP_RADIUS)
                        bot.setControlState('jump', true);

                    if (bot.entity.position.horizontalDistance(p) < bot.move.BLOCK_RADIUS)
                    {
                        bot.clearControlStates();
                        // Should the bot be falling, this ensures that it safetly lands before continuing.
                        if (Math.abs(bot.entity.position.y - p.y) < EPSILON)
                        {
                            clearInterval(mI);
                            // Ensures that the bot is centered on the block.
                            if (bot.entity.position.horizontalDistance(p) > bot.move.BLOCK_RADIUS)
                            {
                                modalTraversal0(p, true)
                                    .then(function(ENUMStatus) {resolve(ENUMStatus);})
                                    .catch(function(ENUMStatus) {reject(ENUMStatus);});
                            }
                            else resolve(bot.move.ENUMStatus.Arrived);
                        }
                    }

                    if (Date.now() - startTime > bot.move.TIMEOUT)
                    {
                        bot.clearControlStates();
                        clearInterval(mI);
                        reject(bot.move.ENUMStatus.Timeout);
                    }
                },
                bot.move.MONITOR_INTERVAL
            );
        });

        return MovePromise;
    }
};

Vec3.Vec3.prototype.horizontalDistance = function(s)
{
    const dx = s.x - this.x;
    const dz = s.z - this.z;
    return Math.sqrt(dx * dx + dz * dz);
};
