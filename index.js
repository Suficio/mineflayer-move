// Ensure move always centeres on block whichever move type
EventEmitter = require('events').EventEmitter;
const Vec3 = require('vec3');

const EPSILON = 0.06;

module.exports = function(bot)
{
    bot.move = new EventEmitter;

    bot.move.ENUMMOVE = {Walk: 0, Hop: 1, Jump: 2};
    bot.move.ENUMStatus = {Arrived: 0, Failed: 1, Timeout: 2};

    bot.move.MONITOR_INTERVAL = 40;
    bot.move.TIMEOUT = 2600;
    bot.move.BLOCK_RADIUS = 0.14;
    bot.move.JUMP_RADIUS = 0.82;

    bot.move.lookTowards = function(p)
    {
        bot.lookAt(Vec3(p.x, bot.entity.position.y + bot.entity.height, p.z));
    };

    const modalTraversal =
    [
        modalTraversal0,
        modalTraversal1,
        modalTraversal2,
    ];

    // WARNING!: Bot will attempt to move to any block specified in one move, therefore ensure that it is possible to move to that block.
    bot.move.to = function(blockPosition)
    {
        const p = blockPosition.floored().add(new Vec3(0.5, 0, 0.5));
        const bp = bot.entity.position.floored().add(new Vec3(0.5, 0, 0.5));

        const horizDelta = p.horizontalDistance(bp);
        const vertDelta = p.y - bp.y;

        if (p.distanceTo(bp) > 6)
            console.warn('WARNING Move: Bot will probably not be able to move to this in one move, could lead to unexpected behaivor.');

        let MODE = bot.move.ENUMMOVE.Walk;
        if (horizDelta > 1 || vertDelta > 0) MODE = 1;
        if (horizDelta > 3 || (horizDelta > 2 && vertDelta > 0)) MODE = 2;

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

    bot.move.along = function(_p)
    {
        const GlobalMovePromise = new Promise(function(resolve, reject)
        {
            // Clones the array so the original reference doesnt get modified
            const path = _p.slice(0);

            function moveAlong()
            {
                if (path.length !== 0)
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
                        }
                        );
                }
                else
                    resolve(bot.move.ENUMStatus.Arrived);
            }
            moveAlong();
        });

        return GlobalMovePromise;
    };

    function modalTraversal0(p)
    {
        const MovePromise = new Promise(function(resolve, reject)
        {
            const startTime = Date.now();
            const mI = setInterval(
                function()
                {
                    bot.move.lookTowards(p);
                    bot.setControlState('forward', true);

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

                    if (bot.entity.position.distanceTo(bp) >= 0)
                        bot.setControlState('jump', true);

                    // Additional value makes sure the bot stops jumping on time, any offet from block center will be later corrected
                    if (bot.entity.position.horizontalDistance(p) < bot.move.BLOCK_RADIUS + 0.20)
                    {
                        bot.clearControlStates();
                        // Should the bot be falling, this ensures that it safetly lands before continuing.
                        if (Math.abs(bot.entity.position.y - p.y) < EPSILON)
                        {
                            clearInterval(mI);
                            // Ensures that the bot is centered on the block.
                            modalTraversal0(p)
                                .then(function(ENUMStatus) {resolve(ENUMStatus);})
                                .catch(function(ENUMStatus) {reject(ENUMStatus);});
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

                    if (bot.entity.position.distanceTo(bp) > bot.move.JUMP_RADIUS)
                        bot.setControlState('jump', true);

                    if (bot.entity.position.horizontalDistance(p) < bot.move.BLOCK_RADIUS + 0.20)
                    {
                        bot.clearControlStates();
                        // Should the bot be falling, this ensures that it safetly lands before continuing.
                        if (Math.abs(bot.entity.position.y - p.y) < EPSILON)
                        {
                            clearInterval(mI);
                            // Ensures that the bot is centered on the block.
                            modalTraversal0(p)
                                .then(function(ENUMStatus) {resolve(ENUMStatus);})
                                .catch(function(ENUMStatus) {reject(ENUMStatus);});
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
