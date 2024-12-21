import { world, system, BlockPermutation, ItemComponentTypes, ItemCooldownComponent } from "@minecraft/server";

// Blocks which have cardinal direction state
const redstoneComponentCardinalBlocks: string[] = [
	"minecraft:unpowered_repeater",
	"minecraft:powered_repeater",
	"minecraft:unpowered_comparator",
	"minecraft:powered_comparator"
];

// Blocks which have facing direction state as number
const redstoneComponentNumberFacingBlocks: string[] = [
	"minecraft:piston",
	"minecraft:sticky_piston",
	"minecraft:dropper",
	"minecraft:dispenser",
	"minecraft:hopper"
];

// Minecraft being minecraft can't really do anything
// Blocks which have facing direction state as string
const redstoneComponentStringFacingBlocks: string[] = [
	"minecraft:observer"
];

// Blocks which have orientation state
const redstoneComponentOrientationBlocks: string[] = [
	"minecraft:crafter"
];

const cardinalDirectionMapping: { [key: string]: string } = {
	"north": "west",
	"east": "north",
	"south": "east",
	"west": "south"
};

const numberFacingDirectionMapping: { [key: number]: number } = {
	0: 1,
	1: 3,
	2: 4,
	3: 5,
	4: 0,
	5: 2
};

const stringFacingDirectionMapping: { [key: string]: string } = {
	"down": "up",
	"up": "south",
	"north": "west",
	"east": "north",
	"south": "east",
	"west": "down"
};

const orientationDirectionMapping: { [key: string]: string } = {
	"down_north": "down_west",
	"down_east": "down_north",
	"down_south": "down_east",
	"down_west": "up_south",
	"up_north": "up_west",
	"up_east": "up_north",
	"up_south": "up_east",
	"up_west": "south_up",
	"north_up": "west_up",
	"east_up": "north_up",
	"south_up": "east_up",
	"west_up": "down_south"
};

world.beforeEvents.itemUseOn.subscribe(useOnEvent => {
	const { itemStack: item, block, source: player } = useOnEvent;

	if (item.typeId !== "bt:rw.wrench") return;

	const { typeId: blockTypeId, permutation: blockPermutation } = block;

	if (redstoneComponentCardinalBlocks.includes(blockTypeId) || redstoneComponentNumberFacingBlocks.includes(blockTypeId) || redstoneComponentStringFacingBlocks.includes(blockTypeId) || redstoneComponentOrientationBlocks.includes(blockTypeId)) {
		useOnEvent.cancel = true;

		system.run(() => {
			const itemCooldownComponent: ItemCooldownComponent = item.getComponent(ItemComponentTypes.Cooldown) as ItemCooldownComponent;

			if (itemCooldownComponent.getCooldownTicksRemaining(player) !== 0) return;

			itemCooldownComponent.startCooldown(player);

			if (redstoneComponentCardinalBlocks.includes(blockTypeId)) {
				const newDirection: string = cardinalDirectionMapping[blockPermutation.getState("minecraft:cardinal_direction") as string] as string;
				const redstoneComponentBlock: string = blockTypeId.replace(/minecraft:powered_|minecraft:unpowered_/g, "");

				// Block is first become air to fix a weird bug where a new redstone connectivity called "quantum connectivity" takes place
				block.setType("minecraft:air");

				if (redstoneComponentBlock === "repeater") block.setPermutation(BlockPermutation.resolve(`minecraft:unpowered_${redstoneComponentBlock}`, { "minecraft:cardinal_direction": newDirection, "repeater_delay": blockPermutation.getState("repeater_delay") as number }));
				else if (redstoneComponentBlock === "comparator") block.setPermutation(BlockPermutation.resolve(`minecraft:unpowered_${redstoneComponentBlock}`, { "minecraft:cardinal_direction": newDirection, "output_lit_bit": blockPermutation.getState("output_lit_bit") as boolean, "output_subtract_bit": blockPermutation.getState("output_subtract_bit") as boolean }));
			}
			else if (redstoneComponentNumberFacingBlocks.includes(blockTypeId)) {
				const newDirection: number = numberFacingDirectionMapping[blockPermutation.getState("facing_direction") as number] as number;

				if (blockTypeId === "minecraft:piston" || blockTypeId === "minecraft:sticky_piston") {
					// Block is first become air to fix a weird bug where piston arm activate will be still active when the piston is rotated
					block.setType("minecraft:air");

					block.setPermutation(BlockPermutation.resolve(blockTypeId, { "facing_direction": newDirection }));
				}
				else block.setPermutation(blockPermutation.withState("facing_direction", newDirection));
			}
			else if (redstoneComponentStringFacingBlocks.includes(blockTypeId)) {
				const newDirection: string = stringFacingDirectionMapping[blockPermutation.getState("minecraft:facing_direction") as string] as string;

				block.setPermutation(blockPermutation.withState("minecraft:facing_direction", newDirection));
			}
			else {
				const newDirection: string = orientationDirectionMapping[blockPermutation.getState("orientation") as string] as string;

				block.setPermutation(blockPermutation.withState("orientation", newDirection));
			}
		});
	}
});