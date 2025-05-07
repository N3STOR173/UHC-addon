import { world, Player, GameMode, Effect, EntityDieAfterEvent, EntityInventoryComponent, ItemStack, EntityEquippableComponent, EquipmentSlot, Vector3, PlayerSpawnAfterEvent } from "@minecraft/server";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";

let lives:Map<String,number>;
let spawnPoints:Map<String,{x:number, z:number}>;
let finalSpawnPoints:Map<String,{x:number, y:number, z:number}>;

export function processPlayerDie(event:EntityDieAfterEvent) {
  spawnPoints.set(event.deadEntity.nameTag, {x:event.deadEntity.location.x, z:event.deadEntity.location.z});
  if (event.damageSource.damagingEntity?.typeId == "minecraft:player" || !checkLives(event.deadEntity as Player)) {
      const location = {x:event.deadEntity.location.x, y:event.deadEntity.location.y+1, z:event.deadEntity.location.z};
  
      const inventory = event.deadEntity.getComponent("inventory") as EntityInventoryComponent;
      for (let i = 0; i < 36; i++) {
        const item = inventory.container?.getSlot(i).getItem() as ItemStack;
        if (item == undefined) continue;
        world.getDimension("overworld").spawnItem(item, location);
      }
  
      const equipment =  event.deadEntity.getComponent("minecraft:equippable") as EntityEquippableComponent;
      for (let i of Object.values(EquipmentSlot)) {
        if (i == EquipmentSlot.Mainhand) continue;
        const e = equipment.getEquipment(i) as ItemStack;
        if (e == undefined) continue;
        world.getDimension("overworld").spawnItem(e, location);
      }

      const level = (event.deadEntity as Player).level;
      for (let i = 0; i < level; i++) {
        for (let j = 0; j < 7; j++) {
          world.getDimension("overworld").spawnEntity("minecraft:experience_orb", location);
        }
      }
  
      setLives(event.deadEntity as Player, 0);
      const cords:Vector3 = {x:event.deadEntity.location.x, y:event.deadEntity.location.y, z:event.deadEntity.location.z};
      setFinalSpawn(event.deadEntity as Player, cords);
    }
}

export function processPlayerSpawn(event:PlayerSpawnAfterEvent) { 
  if (!event.initialSpawn) {
    checkLives(event.player);
    revive(event.player);
  }
}

export function initialize (lifes:number) {
  //spawnPointsAux:Map<String,{x:number, z:number}>
  //spawnPoints = spawnPointsAux;
  spawnPoints = new Map<String,{x:number, z:number}>();
  finalSpawnPoints = new Map<String,{x:number, y:number, z:number}>();
  lives = new Map<String,number>();
  world.getAllPlayers().forEach((player) => {
    lives.set(player.nameTag, lifes - 1);
  });
  /*spawnPointsAux.forEach((value, key) => {
    lives.set(key, lifes - 1);
  });*/
}

export function setLives(player:Player, x:number) {
  lives.set(player.nameTag, x);
}

//se usa para que el jugador entre en el modo espectador en la coordenada donde murio
export function setFinalSpawn(player:Player, cords:{x:number, y:number, z:number}) {
  finalSpawnPoints.set(player.nameTag, cords);
}

export function setExtraHealthBars(finalSize:number, player:Player, extra:boolean) {
  
  let aux = lives.get(player.nameTag);
  world.sendMessage("aux: " + aux);
  if (aux != undefined && aux > -1) {
    if (extra) {
      player.runCommandAsync("effect @s health_boost infinite "  + (aux * 5 + 4) + " true");
      player.runCommandAsync("effect @s instant_health " + (aux * 5 + 5) + " 0 true");
    }
    else {
      player.runCommandAsync("effect @s health_boost infinite "  + (aux * 5 - 1) + " true");
      player.runCommandAsync("effect @s instant_health " + (aux * 5) + " 0 true");
    }
    lives.set(player.nameTag, 0);
  }
}

//devuelve true si puede revivir y false si no puede
function checkLives(player:Player):boolean {
  let vidas = lives.get(player.nameTag)
  if (vidas == 0) {
    return false;
  }
  else {
    return true;
  }
}

function revive(player:Player) {
  let vidas = lives.get(player.nameTag);
  
  if (vidas == 0) {
    player.setGameMode(GameMode.spectator);
    world.sendMessage("§4§lEl jugador " + player.nameTag + " ha sido eliminado");
    player.teleport(finalSpawnPoints.get(player.nameTag) as {x:number, y:number, z:number});
    lives.set(player.nameTag, lives.get(player.nameTag) as number - 1);
  }
  else {
    if (vidas == 1) {
      world.sendMessage("§4§lAl jugador " + player.nameTag + " le queda " + vidas + " vida");
    }
    else {
      world.sendMessage("§4§lAl jugador " + player.nameTag + " le quedan " + vidas + " vidas");
    }
    lives.set(player.nameTag, lives.get(player.nameTag) as number - 1);
    teleportPlayer(player);
  }
}

function teleportPlayer(player: Player) {
  let x:number = 0, z:number = 0;
  let spawnPoint = spawnPoints.get(player.nameTag);
  x = spawnPoint?.x as number;
  z = spawnPoint?.z as number;

  let effects: Effect[] = player.getEffects();
  for (let effect of effects){
    player.removeEffect(effect.typeId);
  }

  player.addEffect(MinecraftEffectTypes.Resistance, 160, { amplifier: 255, showParticles: false });
  player.addEffect(MinecraftEffectTypes.InstantHealth, 160, { amplifier: 255, showParticles: false });
  player.addEffect(MinecraftEffectTypes.Saturation, 160, { amplifier: 255, showParticles: false });
  player.teleport({x:x, y:320, z:z});
}