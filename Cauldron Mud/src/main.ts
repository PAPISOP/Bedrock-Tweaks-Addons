import { world, system, ItemStack, EntityInitializationCause, EntityComponentTypes, Block, EntityItemComponent } from "@minecraft/server";

const dirtVariantBlocks: string[] = [
	"minecraft:dirt",
	"minecraft:coarse_dirt",
	"minecraft:dirt_with_roots"
];

world.afterEvents.entitySpawn.subscribe(spawnEvent => {
	if (spawnEvent.cause !== EntityInitializationCause.Spawned) return;

	const { entity } = spawnEvent;

	if (!entity.hasComponent(EntityComponentTypes.Item)) return;

	const item: ItemStack = (entity.getComponent(EntityComponentTypes.Item) as EntityItemComponent).itemStack;

	if (dirtVariantBlocks.includes(item.typeId)) {
		let checkLimitCount: number = 0;
		const runId: number = system.runInterval(() => {
			if (!entity.isValid()) {
				system.clearRun(runId);
				return;
			}

			if (entity.getVelocity().y === 0) {
				const { dimension: entityDimension } = entity;

				const block: Block | undefined = entityDimension.getBlock(entity.location);

				// If the chunk in which the item is dropped is unloaded, then stop the further execution
				if (!block) {
					system.clearRun(runId);
					return;
				}

				const belowBlock: Block = block.below() as Block;

				// This prevents false positives
				if (belowBlock.isAir) return;

				// This prevents cases when the item is on top of the cauldron block for few moments until going inside are not considered
				if (belowBlock.typeId === "minecraft:cauldron") {
					// If the item is still on top of the cauldron block for more than 10 ticks, then stop the further execution
					if (checkLimitCount > 10) system.clearRun(runId);
					else checkLimitCount++;

					return;
				}

				system.clearRun(runId);

				if (block.typeId === "minecraft:cauldron") {
					const { permutation } = block;

					if ((permutation.getState("cauldron_liquid") as string) === "water" && (permutation.getState("fill_level") as number) >= 1) {
						entity.remove();

						entityDimension.spawnItem(new ItemStack("minecraft:mud", item.amount), block.center());
					}
				}
			}
		}, 1);
	}
});