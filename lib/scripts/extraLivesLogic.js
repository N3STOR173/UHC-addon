import { world, GameMode, EquipmentSlot } from "@minecraft/server";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
let lives;
let spawnPoints;
let finalSpawnPoints;
export function processPlayerDie(event) {
    var _a, _b;
    if (((_a = event.damageSource.damagingEntity) === null || _a === void 0 ? void 0 : _a.typeId) == "minecraft:player" || !checkLives(event.deadEntity)) {
        const location = { x: event.deadEntity.location.x, y: event.deadEntity.location.y + 1, z: event.deadEntity.location.z };
        const inventory = event.deadEntity.getComponent("inventory");
        for (let i = 0; i < 36; i++) {
            const item = (_b = inventory.container) === null || _b === void 0 ? void 0 : _b.getSlot(i).getItem();
            if (item == undefined)
                continue;
            world.getDimension("overworld").spawnItem(item, location);
        }
        const equipment = event.deadEntity.getComponent("minecraft:equippable");
        for (let i of Object.values(EquipmentSlot)) {
            if (i == EquipmentSlot.Mainhand)
                continue;
            const e = equipment.getEquipment(i);
            if (e == undefined)
                continue;
            world.getDimension("overworld").spawnItem(e, location);
        }
        setLives(event.deadEntity, 0);
        const cords = { x: event.deadEntity.location.x, y: event.deadEntity.location.y, z: event.deadEntity.location.z };
        setFinalSpawn(event.deadEntity, cords);
    }
}
export function processPlayerSpawn(event) {
    if (!event.initialSpawn) {
        checkLives(event.player);
        revive(event.player);
    }
}
export function initialize(spawnPointsAux, lifes) {
    spawnPoints = spawnPointsAux;
    finalSpawnPoints = new Map();
    lives = new Map();
    spawnPointsAux.forEach((value, key) => {
        lives.set(key, lifes - 1);
    });
}
export function setLives(player, x) {
    lives.set(player.nameTag, x);
}
export function setFinalSpawn(player, cords) {
    finalSpawnPoints.set(player.nameTag, cords);
}
//devuelve true si puede revivir y false si no puede
function checkLives(player) {
    let vidas = lives.get(player.nameTag);
    if (vidas == 0) {
        return false;
    }
    else {
        return true;
    }
}
function revive(player) {
    let vidas = lives.get(player.nameTag);
    if (vidas == 0) {
        player.setGameMode(GameMode.spectator);
        world.sendMessage("§4§lEl jugador " + player.nameTag + " ha sido eliminado");
        player.teleport(finalSpawnPoints.get(player.nameTag));
    }
    else {
        if (vidas == 1) {
            world.sendMessage("§4§lAl jugador " + player.nameTag + " le queda " + vidas + " vida");
        }
        else {
            world.sendMessage("§4§lAl jugador " + player.nameTag + " le quedan " + vidas + " vidas");
        }
        lives.set(player.nameTag, lives.get(player.nameTag) - 1);
        teleportPlayer(player);
    }
}
function teleportPlayer(player) {
    let x = 0, z = 0;
    let spawnPoint = spawnPoints.get(player.nameTag);
    x = spawnPoint === null || spawnPoint === void 0 ? void 0 : spawnPoint.x;
    z = spawnPoint === null || spawnPoint === void 0 ? void 0 : spawnPoint.z;
    let effects = player.getEffects();
    for (let effect of effects) {
        player.removeEffect(effect.typeId);
    }
    player.addEffect(MinecraftEffectTypes.Resistance, 160, { amplifier: 255, showParticles: false });
    player.addEffect(MinecraftEffectTypes.InstantHealth, 160, { amplifier: 255, showParticles: false });
    player.addEffect(MinecraftEffectTypes.Saturation, 160, { amplifier: 255, showParticles: false });
    player.teleport({ x: x, y: 320, z: z });
}
//# sourceMappingURL=extraLivesLogic.js.map