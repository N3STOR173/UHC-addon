import { world, GameMode, EquipmentSlot, system } from "@minecraft/server";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { controller } from "./main";
let finalSpawnPoints; //necesario persistencia
let spawnDimention; //necesario persistencia
let spawnLocation; //necesario persistencia
let deathMessage; //para mostrar el mensaje despues de reaparecer
export function processPlayerDie(event) {
    var _a, _b;
    const cords = { x: event.deadEntity.location.x, y: event.deadEntity.location.y, z: event.deadEntity.location.z };
    if (spawnLocation == "muerte") {
        finalSpawnPoints.set(event.deadEntity.nameTag, cords);
        spawnDimention.set(event.deadEntity.nameTag, event.deadEntity.dimension);
    }
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
        const level = event.deadEntity.level;
        for (let i = 0; i < level; i++) {
            for (let j = 0; j < 7; j++) {
                world.getDimension("overworld").spawnEntity("minecraft:experience_orb", location);
            }
        }
        setLives(event.deadEntity, 0);
        finalSpawnPoints.set(event.deadEntity.nameTag, cords);
        spawnDimention.set(event.deadEntity.nameTag, event.deadEntity.dimension);
    }
}
export function processPlayerSpawn(event) {
    if (!event.initialSpawn) {
        const player = event.player;
        let vidas = world.getDynamicProperty("lives:" + player.nameTag);
        if (vidas == 0) {
            player.setGameMode(GameMode.spectator);
            world.sendMessage("§4§lEl jugador " + player.nameTag + " ha sido eliminado");
            player.teleport(finalSpawnPoints.get(player.nameTag), { dimension: spawnDimention.get(player.nameTag) });
            world.setDynamicProperty("lives:" + player.nameTag, world.getDynamicProperty("lives:" + player.nameTag) - 1);
            deathMessage.set(player.nameTag, deathMessage.get(player.nameTag) + 1);
        }
        else {
            //mensajes
            if (vidas == 1) {
                world.sendMessage("§4§lAl jugador " + player.nameTag + " le queda " + vidas + " vida");
            }
            else {
                world.sendMessage("§4§lAl jugador " + player.nameTag + " le quedan " + vidas + " vidas");
            }
            world.setDynamicProperty("lives:" + player.nameTag, world.getDynamicProperty("lives:" + player.nameTag) - 1);
            //logica
            if (spawnLocation == "muerte") {
                blockPvp(player);
                player.addEffect(MinecraftEffectTypes.Resistance, 1200, { amplifier: 255, showParticles: false });
                player.teleport(finalSpawnPoints.get(player.nameTag), { dimension: spawnDimention.get(player.nameTag) });
            }
            else if (spawnLocation == "spawn") {
                teleportPlayer(player);
            }
        }
    }
}
export function initialize(params, spawnPointsAux) {
    spawnLocation = params[2];
    if (spawnLocation == "muerte") {
        finalSpawnPoints = new Map();
    }
    else if (spawnLocation == "spawn") {
        finalSpawnPoints = spawnPointsAux;
    }
    ;
    spawnDimention = new Map();
    deathMessage = new Map();
    world.getAllPlayers().forEach((player) => {
        world.setDynamicProperty("lives:" + player.nameTag, params[0] - 1);
        deathMessage.set(player.nameTag, 0);
    });
}
export function setLives(player, x) {
    world.setDynamicProperty("lives:" + player.nameTag, x);
}
export function setExtraHealthBars(finalSize, player) {
    let auxX;
    let auxZ;
    if (player.location.x < 0)
        auxX = 2;
    else
        auxX = 1;
    if (player.location.z < 0)
        auxZ = 2;
    else
        auxZ = 1;
    let distx = Math.floor(Math.abs(player.location.x)) - finalSize + auxX;
    let distz = Math.floor(Math.abs(player.location.z)) - finalSize + auxZ;
    let extra = (distx < 1 && distz < 1 && player.dimension == world.getDimension("overworld"));
    let aux = world.getDynamicProperty("lives:" + player.nameTag);
    world.sendMessage("aux: " + aux);
    if (aux != undefined && aux > -1) {
        if (extra) {
            player.runCommandAsync("effect @s health_boost infinite " + (aux * 5 + 5 - 1) + " true");
            player.runCommandAsync("effect @s instant_health " + (aux * 5 + 5) + " 0 true");
        }
        else {
            player.runCommandAsync("effect @s health_boost infinite " + (aux * 5 - 1) + " true");
            player.runCommandAsync("effect @s instant_health " + (aux * 5) + " 0 true");
        }
        world.setDynamicProperty("lives:" + player.nameTag, 0);
    }
}
function checkLives(player) {
    let vidas = world.getDynamicProperty("lives:" + player.nameTag);
    if (vidas == 0) {
        return false;
    }
    else {
        return true;
    }
}
function teleportPlayer(player) {
    let x = 0, z = 0;
    let spawnPoint = finalSpawnPoints.get(player.nameTag);
    x = spawnPoint === null || spawnPoint === void 0 ? void 0 : spawnPoint.x;
    z = spawnPoint === null || spawnPoint === void 0 ? void 0 : spawnPoint.z;
    let effects = player.getEffects();
    for (let effect of effects) {
        player.removeEffect(effect.typeId);
    }
    player.addEffect(MinecraftEffectTypes.Resistance, 160, { amplifier: 255, showParticles: false });
    player.addEffect(MinecraftEffectTypes.InstantHealth, 160, { amplifier: 255, showParticles: false });
    player.addEffect(MinecraftEffectTypes.Saturation, 160, { amplifier: 255, showParticles: false });
    player.teleport({ x: x, y: 320, z: z }, { dimension: world.getDimension("overworld") });
}
function blockPvp(player) {
    //quitar despues
    if (deathMessage == undefined)
        deathMessage = new Map();
    if (deathMessage.get(player.nameTag) == undefined)
        deathMessage.set(player.nameTag, 0);
    //quitar despues
    deathMessage.set(player.nameTag, deathMessage.get(player.nameTag) + 1);
    let before = deathMessage.get(player.nameTag);
    controller("actionBarDisactive", [player]);
    let subscription;
    let livesPrev = new Map();
    let lives = new Map();
    world.getAllPlayers().forEach((p) => {
        lives.set(p.nameTag, p.getComponent("health").currentValue);
    });
    subscription = world.afterEvents.entityHurt.subscribe((event) => {
        var _a, _b;
        const damageSource = event.damageSource;
        const hurtEntity = event.hurtEntity;
        if (((_a = damageSource === null || damageSource === void 0 ? void 0 : damageSource.damagingEntity) === null || _a === void 0 ? void 0 : _a.nameTag) == player.nameTag &&
            ((_b = damageSource === null || damageSource === void 0 ? void 0 : damageSource.damagingEntity) === null || _b === void 0 ? void 0 : _b.typeId) === "minecraft:player" &&
            (hurtEntity === null || hurtEntity === void 0 ? void 0 : hurtEntity.typeId) === "minecraft:player") {
            hurtEntity.getComponent("health").setCurrentValue(livesPrev.get(hurtEntity.nameTag));
        }
    });
    const resistanceTime = 60;
    const blockPvpTime = 100;
    system.run(() => bucle(resistanceTime, 0));
    function bucle(resistance, blockPvp) {
        blockPvp++;
        if (blockPvp % 20 == 0) {
            resistance--;
            livesPrev = new Map(lives);
            world.getAllPlayers().forEach((p) => {
                lives.set(p.nameTag, p.getComponent("health").currentValue);
            });
            if (resistance > 0) {
                player.runCommand("/title @s actionbar Resistencia: " + resistance
                    + " | pvp disabled: " + (blockPvpTime - blockPvp / 20));
            }
            else {
                player.runCommand("/title @s actionbar pvp disabled: " + (blockPvpTime - blockPvp / 20));
            }
        }
        if (blockPvp < 20 * blockPvpTime && deathMessage.get(player.nameTag) == before) {
            system.run(() => bucle(resistance, blockPvp));
        }
        else {
            world.afterEvents.entityHurt.unsubscribe(subscription);
            controller("actionBarActive", [player]);
        }
    }
}
//# sourceMappingURL=extraLivesLogic.js.map