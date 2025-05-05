import { ActionFormData, ActionFormResponse, ModalFormData } from "@minecraft/server-ui";
import { world, Player } from "@minecraft/server";
import { windowController, controller } from "./main";

let phase = 1; // 1 = team selection, 2 = game settings
let seleccionMade = false;
let someoneChoosing = false;
let playerChoosing:String;

let lifes:number;
let time:number;

let playersConfirmed = new Set<string>();
let playersNotConfirmed = new Set<string>();

let firstTutorialSeen = new Set<string>();
let secondTutorialSeen = new Set<string>();

let concurrentAux = 0;

function checkConcurrence(aux:number, player:Player) :boolean {
  if (aux != concurrentAux) {
    player.runCommand("/title @s actionbar Alguien canceló y no se ha procesado tu selección");
    return true;
  }
  else {
    return false;
  }
}

function processConfirmSelection(player:Player) {
  playersConfirmed.add(player.nameTag);
  playersNotConfirmed.delete(player.nameTag);
  if (playersNotConfirmed.size == 0) {
    world.sendMessage("§2Todos los jugadores han confirmado la configuración de la partida");
    phase = 3;
    world.getAllPlayers().forEach(p => {
      //finalWindow(p);
      controller("confirm", [lifes, time]);
    });
  }
}

function buildBody(): string {
  let body = "\n===============================\n";
  if (playersConfirmed.size > 0) {
    body += "\nJugadores que han aceptado:\n";
    playersConfirmed.forEach(p => {
      body += p + "\n";
    });
  }
  if (playersNotConfirmed.size > 0) {
    body += "\nJugadores pendientes:\n";
    playersNotConfirmed.forEach(p => {
      body += p + "\n";
    });
  }
  body += "\n";
  return body;
}

function gameSettingsWindow(player:Player) {
  if (seleccionMade) {
    const aux = concurrentAux;
    const confirm = new ActionFormData()
      .title("Configuración de la partida")
      .body("\nConfiguración de la partida propuesta por " + player + "\n\n"
        + "tiempo: " + time + " minutos\n"
        + "vidas: " + lifes + "\n"
        + buildBody())
      .button("rechazar");
    if (playersNotConfirmed.has(player.nameTag)) {
      confirm.button("aceptar");
    }

    confirm.show(player).then((response) => {
      if (response.selection == 0) { //CANCELAR
        if (checkConcurrence(aux, player)) return;
        concurrentAux++;
        seleccionMade = false;
        world.sendMessage("§4" + player.nameTag + " ha rechazado los ajustes propuestos");
      }
      else if (response.selection == 1) { //CONFIRMAR
        if (checkConcurrence(aux, player)) return;
        processConfirmSelection(player);
      }
    });
  }

  else {
    if (!someoneChoosing) {
    someoneChoosing = true;
    playerChoosing = player.nameTag;

    const configurationWindow = new ModalFormData()
      .title("Configuración de la partida")
      .textField("\nDuración de la partida (en minutos)", "60", "60")
      .dropdown("\nNúmero de vidas", ["1", "2", "3", "4", "5"], 0)

    configurationWindow.show(player).then((response) => {
      if (response.canceled) {
        someoneChoosing = false;
        return;
      }

      else {
        time = Number(response.formValues?.[0] ?? 0);
        lifes = response.formValues && typeof response.formValues[1] === "number" ? response.formValues[1] + 1: 1;
        someoneChoosing = false;
        
        if (!isNaN(time) && time > 0) {
          seleccionMade = true;
          world.getAllPlayers().forEach(p => {
              playersNotConfirmed.add(p.nameTag);
          });
          playersConfirmed.clear();
          world.getAllPlayers().forEach(p => {
            gameSettingsWindow(p);
          });
          world.sendMessage(player.nameTag + " ha propuesto los ajustes de la partida, falta la confirmación por parte de los jugadores");
        }

        else {
          player.sendMessage("Introduce un número válido para el tiempo de la partida");
        }
      }
    });
    }

    else {
      const aviso = new ActionFormData()
        .title("Aviso")
        .body("\n" + playerChoosing + " está eligiendo una configuración de la partida, espera a que termine");
        aviso.show(player);
    }
  }
}

function finalWindow(player:Player) {

  const window = new ActionFormData()
    .title("UHC")
    .body("\nYa se han confirmado todos los ajustes de la partida, "
      + "solo faltaría una explicación de las reglas antes de comenar\n\n"
      + "- Si un jugador es elinado por otro este no revivirá\n\n"
      + "- El mapa es un cuadrado de 3000 por 3000\n\n"
      + "- El centro del mapa es un cuadrado de 300 por 300\n\n"
      + "- Una vez se acabe el tiempo "
    )

  controller("confirmed", [lifes, time]);
}

export function mainMenu(player:Player) {
  if (phase == 1){

    if (firstTutorialSeen.has(player.nameTag)) {
      windowController("startWindow", [player]);
    }

    else {
      firstTutorialSeen.add(player.nameTag);

      const mainMenu = new ActionFormData()
        .title("UHC")
        .body("\nBienvenido a UHC:\n\nAntes de empezar la partida es necesario "
          + "que se elija en conjunto la configuración de la partida "
          + "y el formato de los equipos.\n\n"
          + "Primero alguien debe proponer una configuración y después el resto de jugadores "
          + "debe aceptar o rechazar la propuesta.\n\n")
        .button("comenzar con la selección de equipos");

      mainMenu.show(player).then((response) => {
        if (response.selection == 0) {
          windowController("startWindow", [player]);
        }
      });
    }
  }

  else if (phase == 2) {

    if (secondTutorialSeen.has(player.nameTag)) {
      gameSettingsWindow(player);
    }

    else {
      secondTutorialSeen.add(player.nameTag);

      const mainMenu = new ActionFormData()
        .title("UHC")
        .body("\nYa formados los equipos ahora es necesario configurar "
          + "la duración de la partida y el número de vidas.\n\n"
        )
        .button("comenzar con la configuración de la partida")

      mainMenu.show(player).then((response) => {
        if (response.selection == 0) {
          gameSettingsWindow(player);
        }
      });
    }
  }

  else if (phase == 3) {
    //controller("confirmed", [lifes, time]);
    //finalWindow(player);
  }
}

export function teamsFormed(){
  phase = 2;
  world.getAllPlayers().forEach((player) => {
    mainMenu(player);
  });
}