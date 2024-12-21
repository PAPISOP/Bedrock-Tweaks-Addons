import { world, system, Player, MolangVariableMap, EntityInitializationCause, EntityComponentTypes, Dimension, Block, ItemStack, EntityItemComponent } from "@minecraft/server";

const woolColorBlocks: string[] = [
	"minecraft:black_wool",
	"minecraft:blue_wool",
	"minecraft:brown_wool",
	"minecraft:cyan_wool",
	"minecraft:gray_wool",
	"minecraft:green_wool",
	"minecraft:light_blue_wool",
	"minecraft:light_gray_wool",
	"minecraft:lime_wool",
	"minecraft:magenta_wool",
	"minecraft:orange_wool",
	"minecraft:pink_wool",
	"minecraft:purple_wool",
	"minecraft:red_wool",
	"minecraft:white_wool",
	"minecraft:yellow_wool"
];

const elevatorColorBlocks: string[] = [
	"bt:e.black_elevator",
	"bt:e.blue_elevator",
	"bt:e.brown_elevator",
	"bt:e.cyan_elevator",
	"bt:e.gray_elevator",
	"bt:e.green_elevator",
	"bt:e.light_blue_elevator",
	"bt:e.light_gray_elevator",
	"bt:e.lime_elevator",
	"bt:e.magenta_elevator",
	"bt:e.orange_elevator",
	"bt:e.pink_elevator",
	"bt:e.purple_elevator",
	"bt:e.red_elevator",
	"bt:e.white_elevator",
	"bt:e.yellow_elevator"
];

const everyTicksParticleMolang: MolangVariableMap = new MolangVariableMap();
everyTicksParticleMolang.setVector3("variable.direction", { x: 0.25, y: 1, z: 0.25 });
everyTicksParticleMolang.setFloat("variable.speed", 0.2);

const spawnParticleMolang: MolangVariableMap = new MolangVariableMap();
spawnParticleMolang.setFloat("variable.num_particles", 200);

/**
 * @name startTP
 * @param {Player} player The player who is on top of the elevator block.
 * @param {Dimension} dimension The dimension in which the player is currently in.
 * @param {Block} block The elevator block on which the player is currently standing.
 * @remarks Starts the teleport process when the player is standing on top of the elevator block.
 * 
 * This function cannot be called in read-only mode.
 */
const startTP = (player: Player, dimension: Dimension, block: Block): void => {
	const { max: maxHeight, min: minHeight } = dimension.heightRange;
	const { x: blockX, y: blockY, z: blockZ, typeId: blockTypeId } = block;

	const blockAboveY: number = blockY + 1;
	const blockBelowY: number = blockY - 1;

	const distanceToCheckAbove: number = maxHeight - blockAboveY;
	const distanceToCheckBelow: number = blockBelowY - minHeight;

	let startTick: number = system.currentTick;

	const runId: number = system.runInterval(() => {
		if (!player.isValid()) {
			system.clearRun(runId);
			return;
		}

		// If the player is somehow no longer on top of the same elevator block while tp checking, then clear this runInterval
		if (system.currentTick - startTick >= 200) {
			const { x: playerX, y: playerY, z: playerZ } = player.location;

			const checkBlock: Block | undefined = dimension.getBlock({ x: Math.floor(playerX), y: Math.floor(playerY) - 1, z: Math.floor(playerZ) });

			if (!checkBlock || checkBlock.typeId !== blockTypeId || checkBlock.x !== blockX || checkBlock.y !== blockY || checkBlock.z !== blockZ) {
				system.clearRun(runId);
				player.setDynamicProperty("runId", undefined);

				return;
			}
			else startTick = system.currentTick;
		}

		if (player.isJumping) {
			if (distanceToCheckAbove <= 0) return;

			for (let checkY = blockAboveY; checkY < maxHeight; checkY++) {
				if (!player.isValid()) break;

				const aboveBlock: Block | undefined = dimension.getBlock({ x: blockX, y: checkY, z: blockZ });

				if (!aboveBlock) break;

				if (aboveBlock.typeId === blockTypeId) {
					tpToElevator(player, dimension, runId, aboveBlock);

					break;
				}
			}
		}
		else if (player.isSneaking) {
			if (distanceToCheckBelow <= 0) return;

			for (let checkY = blockBelowY; checkY >= minHeight; checkY--) {
				if (!player.isValid()) break;

				const belowBlock: Block | undefined = dimension.getBlock({ x: blockX, y: checkY, z: blockZ });

				if (!belowBlock) break;

				if (belowBlock.typeId === blockTypeId) {
					tpToElevator(player, dimension, runId, belowBlock);

					break;
				}
			}
		}
	}, 1);

	player.setDynamicProperty("runId", runId);
};

/**
 * @name stopTP
 * @param {Player} player The player who stepped off the elevator block.
 * @remarks Stops the teleport process when the player is no longer on top of the elevator block.
 */
const stopTP = (player: Player): void => {
	const runId: number | undefined = player.getDynamicProperty("runId") as number | undefined;

	if (runId) {
		system.clearRun(runId);
		player.setDynamicProperty("runId", undefined);
	}
};

/**
 * @name tpToElevator
 * @param {Player} player The player who needs to be teleported above the elevator block.
 * @param {Dimension} dimension The dimension in which the player needs to be teleported.
 * @param {number} runId The run identifier which needs to be cleared for no further execution in startTP function.
 * @param {Block} elevatorBlock The elevator block which the player is to be teleported on top of it.
 * @remarks Teleports the player on top of the elevator block.
 * 
 * This function cannot be called in read-only mode.
 */
const tpToElevator = (player: Player, dimension: Dimension, runId: number, elevatorBlock: Block): void => {
	system.clearRun(runId);
	player.setDynamicProperty("runId", undefined);

	const { location: playerLocation } = player;

	dimension.playSound("mob.shulker.teleport", playerLocation, { volume: 4 });

	player.teleport(elevatorBlock.above()!.center());

	// This make sure that the teleport sound is only played when the player is teleported
	const playerY: number = Math.floor(playerLocation.y);
	const playSoundRunId: number = system.runInterval(() => {
		if (!player.isValid()) {
			system.clearRun(playSoundRunId);
			return;
		}

		const { location: newPlayerLocation } = player;

		if (playerY !== Math.floor(newPlayerLocation.y)) {
			dimension.playSound("mob.shulker.teleport", newPlayerLocation, { volume: 4 });

			system.clearRun(playSoundRunId);
		}
	}, 1);
};

world.beforeEvents.worldInitialize.subscribe(initializeEvent => {
	const { blockComponentRegistry } = initializeEvent;

	blockComponentRegistry.registerCustomComponent("bt:tp", {
		onStepOn: stepOnEvent => {
			const { entity: player, dimension, block } = stepOnEvent;

			if (!(player instanceof Player)) return;

			startTP(player, dimension, block);
		},
		onStepOff: stepOffEvent => {
			const { entity: player } = stepOffEvent;

			if (!(player instanceof Player)) return;

			stopTP(player);
		},
		onPlayerDestroy: playerDestroyEvent => {
			// If someone else broke the block other than the player standing, then the player standing tp check will end when their cooldown ends
			const { player } = playerDestroyEvent;

			if (!player) return;

			stopTP(player);
		},
		onTick: tickEvent => {
			const { block, dimension } = tickEvent;
			const { x: blockX, y: blockY, z: blockZ } = block;

			// During dimension change, LocationInUnloadedChunkError may be thrown sometimes
			try {
				dimension.spawnParticle("bt:e.portal_reverse", { x: blockX, y: blockY + 1, z: blockZ }, everyTicksParticleMolang);
			}
			catch (error) {
				if (!(error instanceof Error)) throw error;

				if (!error.message.includes("LocationInUnloadedChunkError")) console.error(`${error.message}${error.stack}`);
			}
		}
	});
});

world.afterEvents.entitySpawn.subscribe(spawnEvent => {
	if (spawnEvent.cause !== EntityInitializationCause.Spawned) return;

	const { entity } = spawnEvent;

	if (!entity.hasComponent(EntityComponentTypes.Item)) return;

	const item: ItemStack = (entity.getComponent(EntityComponentTypes.Item) as EntityItemComponent).itemStack;

	if (item.typeId === "minecraft:ender_pearl") {
		const runId: number = system.runInterval(() => {
			if (!entity.isValid()) {
				system.clearRun(runId);
				return;
			}

			if (entity.getVelocity().y === 0) {
				const { dimension: entityDimension } = entity;

				const block: Block | undefined = entityDimension.getBlock(entity.location)?.below();

				// If the chunk in which the item is dropped is unloaded, then stop the further execution
				if (!block) {
					system.clearRun(runId);
					return;
				}

				// This prevents false positives
				if (block.isAir) return;

				system.clearRun(runId);

				const { typeId: blockTypeId } = block;

				if (woolColorBlocks.includes(blockTypeId)) {
					entity.remove();

					const { x: blockX, y: blockY, z: blockZ } = block;

					block.setType(`bt:e.${blockTypeId.replace(/minecraft:|_wool/g, "")}_elevator`);

					const blockXAdd: number = blockX + 0.5;
					const blockYAdd: number = blockY + 0.5;
					const blockZAdd: number = blockZ + 0.5;

					entityDimension.spawnParticle("minecraft:portal_north_south", { x: blockXAdd, y: blockYAdd, z: blockZAdd }, spawnParticleMolang);
					entityDimension.spawnParticle("minecraft:portal_east_west", { x: blockXAdd, y: blockYAdd, z: blockZAdd }, spawnParticleMolang);

					for (const player of entityDimension.getPlayers({ location: block.location, minDistance: 0, maxDistance: 2 })) {
						const { x: playerX, y: playerY, z: playerZ } = player.location;

						if (Math.floor(playerX) === blockX && Math.floor(playerY) - 1 === blockY && Math.floor(playerZ) === blockZ) startTP(player, entityDimension, block);
					}
				}
			}
		}, 1);
	}
});

world.beforeEvents.playerLeave.subscribe(leaveEvent => {
	const { player } = leaveEvent;

	stopTP(player);
});

world.afterEvents.playerSpawn.subscribe(playerSpawnEvent => {
	if (!playerSpawnEvent.initialSpawn) return;

	const { player } = playerSpawnEvent;

	const { x: playerX, y: playerY, z: playerZ } = player.location;
	const { dimension: playerDimension } = player;

	const block: Block | undefined = playerDimension.getBlock({ x: Math.floor(playerX), y: Math.floor(playerY) - 1, z: Math.floor(playerZ) });

	if (!block) return;

	if (elevatorColorBlocks.includes(block.typeId)) startTP(player, playerDimension, block);
});

world.afterEvents.entityDie.subscribe(dieEvent => {
	const { deadEntity: player } = dieEvent;

	if (!(player instanceof Player)) return;

	stopTP(player);
});

world.afterEvents.worldInitialize.subscribe(() => {
	for (const player of world.getAllPlayers()) {
		const runId: number | undefined = player.getDynamicProperty("runId") as number | undefined;

		if (runId) {
			const { x: playerX, y: playerY, z: playerZ } = player.location;
			const { dimension: playerDimension } = player;

			const block: Block | undefined = playerDimension.getBlock({ x: Math.floor(playerX), y: Math.floor(playerY) - 1, z: Math.floor(playerZ) });

			if (!block) {
				player.setDynamicProperty("runId", undefined);

				continue;
			}

			if (elevatorColorBlocks.includes(block.typeId)) {
				player.setDynamicProperty("runId", undefined);

				startTP(player, playerDimension, block);
			}
			else player.setDynamicProperty("runId", undefined);
		}
	}
});