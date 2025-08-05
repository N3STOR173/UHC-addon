import { world, Player, GameMode, Effect, EntityDieAfterEvent, EntityInventoryComponent, ItemStack, EntityEquippableComponent, EquipmentSlot, Vector3, PlayerSpawnAfterEvent, EntityHealthComponent, system, EntityHurtAfterEvent, EntityHurtAfterEventSignal, Dimension } from "@minecraft/server";
import { MinecraftEffectTypes } from "@minecraft/vanilla-data";
import { controller } from "./main";

let finalSpawnPoints:Map<String,{x:number, y:number, z:number}>; //necesario persistencia
let spawnDimention:Map<String,Dimension>; //necesario persistencia
let spawnLocation:string; //necesario persistencia
let deathMessage:Map<String, number>; //para mostrar el mensaje despues de reaparecer

export function processPlayerDie(event:EntityDieAfterEvent) {
  const cords:Vector3 = {x:event.deadEntity.location.x, y:event.deadEntity.location.y, z:event.deadEntity.location.z};
  if (spawnLocation == "muerte") {
   finalSpawnPoints.set((event.deadEntity as Player).nameTag, cords);
   spawnDimention.set(event.deadEntity.nameTag, event.deadEntity.dimension);
  }
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
      finalSpawnPoints.set((event.deadEntity as Player).nameTag, cords);
      spawnDimention.set(event.deadEntity.nameTag, event.deadEntity.dimension);
    }
}

export function processPlayerSpawn(event:PlayerSpawnAfterEvent) { 
  if (!event.initialSpawn) {
    const player = event.player;
    let vidas = world.getDynamicProperty("lives:"+player.nameTag);
  
    if (vidas == 0) {
      player.setGameMode(GameMode.spectator);
      world.sendMessage("§4§lEl jugador " + player.nameTag + " ha sido eliminado");
      player.teleport(finalSpawnPoints.get(player.nameTag) as {x:number, y:number, z:number}, 
        {dimension: spawnDimention.get(player.nameTag)});
      world.setDynamicProperty("lives:"+player.nameTag, world.getDynamicProperty("lives:"+player.nameTag) as number - 1);
      deathMessage.set(player.nameTag, deathMessage.get(player.nameTag) as number + 1);
    }
    else {
      //mensajes
      if (vidas == 1) {
        world.sendMessage("§4§lAl jugador " + player.nameTag + " le queda " + vidas + " vida");
      }
      else {
        world.sendMessage("§4§lAl jugador " + player.nameTag + " le quedan " + vidas + " vidas");
      }
      world.setDynamicProperty("lives:"+player.nameTag, world.getDynamicProperty("lives:"+player.nameTag) as number - 1);
    
      //logica
      if (spawnLocation == "muerte"){
        blockPvp(player)
        player.addEffect(MinecraftEffectTypes.Resistance, 1200, { amplifier: 255, showParticles: false });
        player.teleport(finalSpawnPoints.get(player.nameTag) as {x:number, y:number, z:number}, 
        {dimension: spawnDimention.get(player.nameTag)});
      }
      else if (spawnLocation == "spawn"){
        teleportPlayer(player);
      }
    }
  }
}

export function initialize (params:any[], spawnPointsAux:Map<String,{x:number, y:number, z:number}>) {
  spawnLocation = params[2];
  if (spawnLocation == "muerte"){
    finalSpawnPoints = new Map<String,{x:number, y:number, z:number}>();
  }
  else if (spawnLocation == "spawn"){
    finalSpawnPoints = spawnPointsAux;
  };
  spawnDimention = new Map<String,Dimension>();
  deathMessage = new Map<String,number>();
  world.getAllPlayers().forEach((player) => {
    world.setDynamicProperty("lives:"+player.nameTag, params[0] - 1);
    deathMessage.set(player.nameTag, 0);
  });
}

export function setLives(player:Player, x:number) {
  world.setDynamicProperty("lives:"+player.nameTag, x);
}

export function setExtraHealthBars(finalSize:number, player:Player) {
  
  let auxX;let auxZ;
  if (player.location.x < 0) auxX = 2; else auxX = 1;
  if (player.location.z < 0) auxZ = 2; else auxZ = 1;
  let distx = Math.floor(Math.abs(player.location.x)) - finalSize+auxX;
  let distz = Math.floor(Math.abs(player.location.z)) - finalSize+auxZ;
  let extra:boolean = (distx < 1 && distz < 1 && player.dimension == world.getDimension("overworld"));

  let aux:number = world.getDynamicProperty("lives:"+player.nameTag) as number;
  world.sendMessage("aux: " + aux);
  if (aux != undefined && aux > -1) {
    if (extra) {
      player.runCommandAsync("effect @s health_boost infinite "  + (aux * 5 + 5 - 1) + " true");
      player.runCommandAsync("effect @s instant_health " + (aux * 5 + 5) + " 0 true");
    }
    else {
      player.runCommandAsync("effect @s health_boost infinite "  + (aux * 5 - 1) + " true");
      player.runCommandAsync("effect @s instant_health " + (aux * 5) + " 0 true");
    }
    world.setDynamicProperty("lives:"+player.nameTag, 0);
  }
}

function checkLives(player:Player):boolean {
  let vidas = world.getDynamicProperty("lives:"+player.nameTag) as number;
  if (vidas == 0) {
    return false;
  }
  else {
    return true;
  }
}

function teleportPlayer(player: Player) {
  let x:number = 0, z:number = 0;
  let spawnPoint = finalSpawnPoints.get(player.nameTag);
  x = spawnPoint?.x as number;
  z = spawnPoint?.z as number;

  let effects: Effect[] = player.getEffects();
  for (let effect of effects){
    player.removeEffect(effect.typeId);
  }

  player.addEffect(MinecraftEffectTypes.Resistance, 160, { amplifier: 255, showParticles: false });
  player.addEffect(MinecraftEffectTypes.InstantHealth, 160, { amplifier: 255, showParticles: false });
  player.addEffect(MinecraftEffectTypes.Saturation, 160, { amplifier: 255, showParticles: false });
  player.teleport({x:x, y:320, z:z}, {dimension: world.getDimension("overworld")});
}

function blockPvp(player: Player) {

  //quitar despues
  if (deathMessage == undefined)
    deathMessage = new Map<String, number>();
  if (deathMessage.get(player.nameTag) == undefined)
    deathMessage.set(player.nameTag, 0)
  //quitar despues

  deathMessage.set(player.nameTag, deathMessage.get(player.nameTag) as number + 1);
  let before = deathMessage.get(player.nameTag);

  controller("actionBarDisactive", [player]);
  let subscription: (event: EntityHurtAfterEvent) => void;
  let livesPrev:Map<string,number> = new Map<string,number >();
  let lives:Map<string,number> = new Map<string,number >();
  world.getAllPlayers().forEach((p) => {
    lives.set(p.nameTag, (p.getComponent("health") as EntityHealthComponent).currentValue);
  });

  subscription = world.afterEvents.entityHurt.subscribe((event) => {

    const damageSource = event.damageSource;
    const hurtEntity = event.hurtEntity;

    if (
      damageSource?.damagingEntity?.nameTag == player.nameTag &&
      damageSource?.damagingEntity?.typeId === "minecraft:player" &&
      hurtEntity?.typeId === "minecraft:player"
    ) {
      (hurtEntity.getComponent("health") as EntityHealthComponent).setCurrentValue(livesPrev.get(hurtEntity.nameTag) as number);
    }
  });

  const resistanceTime = 60;
  const blockPvpTime = 100;
  system.run(() => bucle(resistanceTime, 0));
  function bucle(resistance:number, blockPvp:number) {
    blockPvp++;
    if (blockPvp % 20 == 0){
      resistance--;

      livesPrev = new Map(lives);
      world.getAllPlayers().forEach((p) => {
        lives.set(p.nameTag, (p.getComponent("health") as EntityHealthComponent).currentValue);
      });

      if (resistance > 0) {
        player.runCommand("/title @s actionbar Resistencia: " + resistance
          + " | pvp disabled: " + (blockPvpTime - blockPvp/20));
      }
      else {
        player.runCommand("/title @s actionbar pvp disabled: " + (blockPvpTime - blockPvp/20));
      }
    }
    if (blockPvp < 20 * blockPvpTime && deathMessage.get(player.nameTag) ==  before) {
      system.run(() => bucle(resistance, blockPvp));
    }
    else {
      world.afterEvents.entityHurt.unsubscribe(subscription);
      controller("actionBarActive", [player]);
    }
  }
}