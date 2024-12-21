import { world, system, GameMode, EntityComponentTypes, Vector3, ItemStack, EntityItemComponent } from "@minecraft/server";

world.beforeEvents.playerBreakBlock.subscribe(breakEvent => {
	const { dimension, block, player } = breakEvent;

	if (player.getGameMode() !== GameMode.survival) return;

	breakEvent.cancel = true;

	const blockLocation: Vector3 = block.center();
	const blockItem: ItemStack = block.getItemStack() as ItemStack;

	system.run(() => {
		dimension.runCommand(`setblock ${blockLocation.x} ${blockLocation.y} ${blockLocation.z} air [] destroy`);

		let itemCount: number = 0;
		for (const itemEntity of dimension.getEntities({ location: blockLocation, minDistance: 0, maxDistance: 1, type: "minecraft:item" })) {
			const item: ItemStack = (itemEntity.getComponent(EntityComponentTypes.Item) as EntityItemComponent).itemStack;

			if (item.typeId === "minecraft:obsidian") {
				itemCount += item.amount;

				if (itemCount > 8) break;

				itemEntity.remove();
			}
		}

		dimension.spawnItem(blockItem, blockLocation);
	});
}, { blockTypes: ["minecraft:ender_chest"] });