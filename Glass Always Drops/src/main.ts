import { world, system, GameMode, Vector3, ItemStack } from "@minecraft/server";

world.beforeEvents.playerBreakBlock.subscribe(breakEvent => {
	const { dimension, block, player } = breakEvent;

	if (player.getGameMode() !== GameMode.survival) return;

	breakEvent.cancel = true;

	const blockLocation: Vector3 = block.center();
	const blockItem: ItemStack = block.getItemStack() as ItemStack;

	system.run(() => {
		dimension.runCommand(`setblock ${blockLocation.x} ${blockLocation.y} ${blockLocation.z} air [] destroy`);
		dimension.spawnItem(blockItem, blockLocation);
	});
}, {
	blockTypes: [
		// Glass
		"minecraft:glass",
		"minecraft:black_stained_glass",
		"minecraft:blue_stained_glass",
		"minecraft:brown_stained_glass",
		"minecraft:cyan_stained_glass",
		"minecraft:gray_stained_glass",
		"minecraft:green_stained_glass",
		"minecraft:light_blue_stained_glass",
		"minecraft:light_gray_stained_glass",
		"minecraft:lime_stained_glass",
		"minecraft:magenta_stained_glass",
		"minecraft:orange_stained_glass",
		"minecraft:pink_stained_glass",
		"minecraft:purple_stained_glass",
		"minecraft:red_stained_glass",
		"minecraft:white_stained_glass",
		"minecraft:yellow_stained_glass",
		// Glass Pane
		"minecraft:glass_pane",
		"minecraft:black_stained_glass_pane",
		"minecraft:blue_stained_glass_pane",
		"minecraft:brown_stained_glass_pane",
		"minecraft:cyan_stained_glass_pane",
		"minecraft:gray_stained_glass_pane",
		"minecraft:green_stained_glass_pane",
		"minecraft:light_blue_stained_glass_pane",
		"minecraft:light_gray_stained_glass_pane",
		"minecraft:lime_stained_glass_pane",
		"minecraft:magenta_stained_glass_pane",
		"minecraft:orange_stained_glass_pane",
		"minecraft:pink_stained_glass_pane",
		"minecraft:purple_stained_glass_pane",
		"minecraft:red_stained_glass_pane",
		"minecraft:white_stained_glass_pane",
		"minecraft:yellow_stained_glass_pane"
	]
});