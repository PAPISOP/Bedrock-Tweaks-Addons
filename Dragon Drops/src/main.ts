import { world, system, ItemStack, Dimension, Vector3 } from "@minecraft/server";

interface entityInfo {
	dimension: Dimension;
	location: Vector3;
}

const lootQueue: Map<entityInfo, number> = new Map<entityInfo, number>();
let spawnLootLoopRunning: boolean = false;

const elytraItem: ItemStack = new ItemStack("minecraft:elytra");
const dragonEggItem: ItemStack = new ItemStack("minecraft:dragon_egg");

world.afterEvents.entityDie.subscribe(dieEvent => {
	const { deadEntity } = dieEvent;
	const { dimension: entityDimension, location: entityLocation } = deadEntity;

	try {
		spawnLoot(entityDimension, entityLocation);
	}
	catch {
		lootQueue.set({ dimension: entityDimension, location: entityLocation }, Date.now());

		if (!spawnLootLoopRunning) spawnLootLoop();
	}
}, { entityTypes: ["minecraft:ender_dragon"] });

/**
 * @name spawnLootLoop
 * @remarks Starts a loop which will try to spawn the items at an unloaded chunk for 5 minutes for each entries.
 * 
 * This function cannot be called in read-only mode.
 */
const spawnLootLoop = (): void => {
	spawnLootLoopRunning = true;

	const loop: number = system.runInterval(() => {
		if (!lootQueue.size) {
			system.clearRun(loop);
			spawnLootLoopRunning = false;
			return;
		}

		for (const [entityInfo, time] of lootQueue.entries()) {
			if (Date.now() - time >= 300000) {
				lootQueue.delete(entityInfo);

				return;
			}

			try {
				spawnLoot(entityInfo.dimension, entityInfo.location);

				lootQueue.delete(entityInfo);
			}
			catch { }
		}
	});
};

/**
 * @name spawnLoot
 * @param {Dimension} dimension The dimension in which the loot needs to be spawned in.
 * @param {Vector3} location The location in which the loot needs to be spawned at.
 * @remarks Spawns the loot at the location in the dimension.
 * 
 * This function cannot be called in read-only mode.
 */
const spawnLoot = (dimension: Dimension, location: Vector3): void => {
	dimension.spawnItem(elytraItem, location);
	dimension.spawnItem(dragonEggItem, location);
};