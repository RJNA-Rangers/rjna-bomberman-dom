import RJNA from "./rjna/engine.js";
import { globalSettings } from "./gameSetting.js";


function placeBomb(moving) {
  if (orbital["players"][moving["myPlayerNum"]]["numOfBombs"] > 0) {
    orbital["players"][moving["myPlayerNum"]]["numOfBombs"]--
    return RJNA.tag.div(
      {
        class: `player-${moving["myPlayerNum"]}-bomb player-${moving["myPlayerNum"]}-just-dropped-bomb`, style: {
          top: Math.round(moving.row) * globalSettings["bomb"]["height"] + "px",
          left: Math.round(moving.col) * globalSettings["bomb"]["width"] + "px",
          width: `${globalSettings["bomb"]["width"]}px`,
          height: `${globalSettings["bomb"]["height"]}px`,
          position: "absolute",
        },
        // id: `${powerUpObj["powerUpCoords"][0]}${powerUpObj["powerUpCoords"][1]}`
      },
      {},
      {},
      RJNA.tag.img(
        {
          style: {
            width: "100%",
            height: "100%",
          }
        },
        {},
        { src: globalSettings["bomb"]["src"] })
    )
  }
}

function placeExplosion(moving) {
  return RJNA.tag.div(
    {
      class: `player-${moving["myPlayerNum"]}-explosion explosion`, style: {
        top: Math.round(moving.row) * globalSettings["bomb"]["height"] + "px",
        left: Math.round(moving.col) * globalSettings["bomb"]["width"] + "px",
        width: `${globalSettings["explosion"]["width"]}px`,
        height: `${globalSettings["explosion"]["height"]}px`,
        position: "absolute",
      },
    },
    {},
    {},
    RJNA.tag.img(
      {
        style: {
          width: "100%",
          height: "100%",
        }
      },
      {},
      { src: globalSettings["explosion"]["src"] })
  )
}
function removeFromCellsAndDom(row, col, querySelectorStatement, socket) {
  orbital.cells[row][col] = null;
  let choiceOfPowerUp = ["speed", "flames", "bombs"]
  const removeDomEle = Array.from(
    //.soft-wall
    document.querySelectorAll(`.${querySelectorStatement}`)
  ).filter((ele) => {
    //if the co-ord has a decimal places then make it to 2dp.
    let eleTopDp = Math.pow(10, 0);
    if (ele.style.top.includes(".")) {
      eleTopDp = Math.pow(10, ele.style.top.split(".")[1].length - 2);
    }
    let eleLeftDp = Math.pow(10, 0);
    if (ele.style.left.includes(".")) {
      eleLeftDp = Math.pow(10, ele.style.left.split(".")[1].length - 2);
    }
    let top =
      Math.round(row * globalSettings["wallHeight"] * eleTopDp) / eleTopDp;
    let left =
      Math.round(col * globalSettings["wallWidth"] * eleLeftDp) / eleLeftDp;
    return (
      Math.round(parseFloat(ele.style.top) * eleTopDp) / eleTopDp === top &&
      Math.round(parseFloat(ele.style.left) * eleLeftDp) / eleLeftDp === left
    );
  });
  while (removeDomEle.length > 0) {
    removeDomEle.shift().remove();
    console.log([row, col])
    if (Math.random() < 0.5) {
      let powerUp = choiceOfPowerUp[Math.floor(Math.random() * choiceOfPowerUp.length)]
      let powerUpCoords = [row, col]
      socket.emit("place-power-up", { powerUp, powerUpCoords })
    }
  }
}

// Function to handle explosion propagation in a specific direction
function propagateExplosion(rowChange, colChange, moving, socket) {
  let tmpMovingObj = JSON.parse(JSON.stringify(moving));
  let gameWrapper = document.querySelector(".game-wrapper");
  for (let r = 0; r < moving.flames; r++) {
    tmpMovingObj.row = Math.round(tmpMovingObj.row);
    tmpMovingObj.col = Math.round(tmpMovingObj.col);
    tmpMovingObj.row += rowChange;
    tmpMovingObj.col += colChange;

    // Check if the cell is a wall
    // Stop the explosion if it is
    if (
      orbital.cells[tmpMovingObj.row][tmpMovingObj.col] ===
      globalSettings.wallTypes.wall
    )
      break;

    // Check if the cell is a soft wall
    if (
      orbital.cells[tmpMovingObj.row][tmpMovingObj.col] ===
      globalSettings.wallTypes.softWall
    ) {
      //destroy the soft wall
      removeFromCellsAndDom(tmpMovingObj.row, tmpMovingObj.col, "soft-wall", socket);
      break;
    }
    // If the cell is not a wall place the explosion at the current position
    gameWrapper.appendChild(RJNA.createNode(placeExplosion(tmpMovingObj)));
  }
}

export async function placeBombAndExplode(moving, socket) {
  return new Promise((res, reject) => {
    let newBomb = placeBomb(moving)
    if (newBomb == undefined) {
      reject("placeBomb is undefined")
    } else {
      let bombElement = RJNA.createNode(newBomb);
      setTimeout(() => {
        bombElement.classList.replace(`player-${moving["myPlayerNum"]}-just-dropped-bomb`, 'bomb');
      }, 1000);
      let gameWrapper = document.querySelector(".game-wrapper");
      gameWrapper.appendChild(bombElement);
      setTimeout(() => {
        bombElement.className = `player-${moving["myPlayerNum"]}-explosion explosion`;
        bombElement.children[0].src = globalSettings.explosion.src;
        // Propagate explosion in all four directions
        propagateExplosion(0, 1, moving, socket); // Right
        propagateExplosion(0, -1, moving, socket); // Left
        propagateExplosion(1, 0, moving, socket); // Down
        propagateExplosion(-1, 0, moving, socket); // Up
      }, 2000);
      setTimeout(() => {
        res(moving);
      }, 2500);
    }
  });
}