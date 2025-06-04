import { Player, system, world } from "@minecraft/server";

let start:number;
let end:number;

export function timeMessage(SIZE:number, finalSize:number, players:Set<Player>, netherPlayers:Set<Player>):boolean {
  const currentTime = system.currentTick;
  
  /////////////////////////fin de la partida/////////////////////////////////
  if (currentTime >= end) {
    for (let p of players) {
      world.sendMessage("Se ha acabado el tiempo");
    }
    for (let p of netherPlayers) {
      world.sendMessage("Se ha acabado el tiempo");
    }
    return true;
  }

  /////////////////////////aviso distancia al centro/////////////////////////
  else if ( Math.floor((end - currentTime)/20/60+1) < 21) { 
    players.forEach(p => {
      p.runCommand(sendMessage(p, finalSize));
    });
    netherPlayers.forEach(p => {
      let aux = sendMessage(p, Math.floor(finalSize/8));
      if (Math.abs(p.location.x) * 8 > SIZE || Math.abs(p.location.z) * 8 > SIZE)
        aux += " | Fuera del mapa";
      else
        aux += " | Dentro del mapa";
      p.runCommand(aux);
    });
  }

  /////////////////////////aviso de tiempo restante/////////////////////////
  else {
    for (let p of players) {
      p.runCommand("/title @s actionbar Tiempo: " + Math.floor((end - currentTime)/20/60+1) + " m ");
    }
    for (let p of netherPlayers) {
      if (Math.abs(p.location.x) * 8 > SIZE || Math.abs(p.location.z) * 8 > SIZE) {
        p.runCommand("/title @s actionbar Tiempo: " + Math.floor((end - currentTime)/20/60+1) + " m"
        + " | Fuera del mapa");
      }
      else {
        p.runCommand("/title @s actionbar Tiempo: " + Math.floor((end - currentTime)/20/60+1) + " m"
        + " | Dentro del mapa");
      }
    }
  }
  return false;
}

function sendMessage (p:Player, size:Number):string {
  let res:string = "";
  let currentTime = system.currentTick;
  
  let auxX;let auxZ;
  if (p.location.x < 0) auxX = 2; else auxX = 1;
  if (p.location.z < 0) auxZ = 2; else auxZ = 1;
  let distx = Math.floor(Math.abs(p.location.x)) - (size as number)+auxX;
  let distz = Math.floor(Math.abs(p.location.z)) - (size as number)+auxZ;
  
  if (distx > 0 && distz > 0) { //calculo de la diagonal
    res = "/title @s actionbar Tiempo: " + Math.floor((end - currentTime)/20/60+1) + " m "
      + "| Distancia: " + Math.floor(Math.sqrt(distx*distx + distz*distz)) + " b"
  }

  else if (distx > 0) { //calculo distancia x
    res = "/title @s actionbar Tiempo: " + Math.floor((end - currentTime)/20/60+1) + " m "
    + "| Distancia : " + distx + " b";
  }

  else if (distz > 0) { //calculo distancia z
    res = "/title @s actionbar Tiempo: " + Math.floor((end - currentTime)/20/60+1) + " m "
    + "| Distancia: " + distz + " b";
  }

  else {
    res = "/title @s actionbar Tiempo: " + Math.floor((end - currentTime)/20/60+1) + " m "
    + "| Dentro de la zona"
  }

  return res;
}

export function setTime(startTime:number, endTime:number) {
  start = startTime;
  end = endTime;
}