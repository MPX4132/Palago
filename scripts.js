var Turn = 0;

function GetTilesPerTurn() {
	return $("#setting-tiles-turn button[data-reset]").data("level");
}

function GetRequiredAdjacentTilesPerTurn() {
	return $("#setting-tiles-adjacent button[data-reset]").data("level");
}

function GetPlayerIDFromTurn(turn) {
	return Math.floor(turn / GetTilesPerTurn()) % 2;
}

function GetPlayerTurnFromTurn(turn) {
	return turn % GetTilesPerTurn();
}

function GetBoardUnitCount() {
	return $("#setting-unit-count button[data-reset]").data("level");
}

function UpdateTurnDisplay(turn) {
	if (turn < GetBoardUnitCount()) $("#turn-display").text("Move " + (turn + 1) + "/" + GetBoardUnitCount() + ": P" + (GetPlayerIDFromTurn(turn) + 1) + "-" + (GetPlayerTurnFromTurn(turn) + 1));
	else $("#turn-display").text("Game Over");
}

function Neighbors($target) {
	let $column = $target.parent();
	let $columnPrev = $column.prev();
	let $columnNext = $column.next();
	let offset = $column.hasClass("offset");
	let currentIndex = $target.index();
	
	let $columnChildren = $column.children();
	
	var neighbors = new Array();
	
	let indexOffset = (offset? 0 : -1);
	
	
	if (currentIndex - 1 >= 0) neighbors.push($columnChildren[currentIndex - 1]);
	else neighbors.push(null);
	
	if ($columnNext.length) {
		let $columnNextChildren = $columnNext.children();
		
		if ($columnNextChildren[currentIndex + indexOffset]) neighbors.push($columnNextChildren[currentIndex + indexOffset]);
		else neighbors.push(null);
		
		if ($columnNextChildren[currentIndex + 1 + indexOffset]) neighbors.push($columnNextChildren[currentIndex + 1 + indexOffset]);
		else neighbors.push(null);
		
	} else {
		neighbors.push(null);
		neighbors.push(null);
	}
	
	if (currentIndex + 1 < $columnChildren.length) neighbors.push($columnChildren[currentIndex + 1]);
	else neighbors.push(null);
	
	if ($columnPrev.length) {
		let $columnPrevChildren = $columnPrev.children();
		
		if ($columnPrevChildren[currentIndex + 1 + indexOffset]) neighbors.push($columnPrevChildren[currentIndex + 1 + indexOffset]);
		else neighbors.push(null);
		
		if ($columnPrevChildren[currentIndex + indexOffset]) neighbors.push($columnPrevChildren[currentIndex + indexOffset]);
		else neighbors.push(null);
		
	} else {
		neighbors.push(null);
		neighbors.push(null);
	}
	
	return neighbors;
}

function ValidNeighbors($neighbors) {
	var output = new Array();
	for (var i = 0; i < $neighbors.length; i++) {
		if ($neighbors[i]) output.push($neighbors[i]);
	}
	return output;
}

function GetRemainingUnitsForTurn(turn) {
	return $("#setting-tiles-turn button[data-reset]").data("level") - GetPlayerTurnFromTurn(turn);
}

function NextNonexcludedVertex(vertex, excluded) {	
	let vertexA = vertex.edgeA && vertex.edgeA.destination.data("edge")[vertex.edgeA.vertexID];
	let vertexB = vertex.edgeB && vertex.edgeB.destination.data("edge")[vertex.edgeB.vertexID];
	
	if (vertexA && excluded.indexOf(vertexA) < 0) return vertexA;
	if (vertexB && excluded.indexOf(vertexB) < 0) return vertexB;
	
	return false;
}

function GetVerticesValue(v1, v2) {
	if (!v1 || !v2) GetBoardUnitCount();
	
	let $tileA = v1.edgeA.source;
	let $tileB = v2.edgeA.source;
	
	let tileAy = $tileA.index();
	let tileAx = $tileA.closest("ul").index();
	
	let tileBy = $tileB.index();
	let tileBx = $tileB.closest("ul").index();
	
	let xOffset = Math.abs(tileAx - tileBx);
	let yOffset = Math.abs(tileAy - tileBy);
	
	return xOffset < yOffset? xOffset : yOffset;
}

function GetPath(originVertex) {
	if (!originVertex) return false; // If no vertex was passed, a loop is impossible.
	
	// Unfortunately, I couldn't use a hashmap below, since javascript objects aren't easily hashable,
	// apparently the're ID'd by calling the toString() method... FUCK whoever thought of that.
	var visited = new Array();
	var path = new Array();
	var startVertex = originVertex;
	
	do {
		// Keep track of the path as we search for the start vertex.
		path.push(startVertex);
		
		// Visit the current vertex, by getting source from an edge
		// Notice that they're both coming form the same vertex, meaning,
		// source is the same on vertex[0] and vertex[1]...
		// NOTICE: This is needed to check for 
		visited.push(startVertex);
		
		startVertex = NextNonexcludedVertex(startVertex, visited);
		
	} while (startVertex); // If we've still go at least one unvisited vertex, continue searching.
	
	// Reverse the path to get accurate order, since we found the start now we head to the end.
	path.reverse();
	
	// Start path search again at the origin, the now last item in path (since it was first originally).
	var endVertex = NextNonexcludedVertex(originVertex, visited);
	
	// If there's no end vertex ready, then the path is complete.
	if (!endVertex) return path;
	
	do {
		// Keep track of the path as we search for the start vertex.
		path.push(endVertex);
		
		// Visit the current vertex, by getting source from an edge
		// Notice that they're both coming form the same vertex, meaning,
		// source is the same on vertex[0] and vertex[1]...
		// NOTICE: This is needed to check for 
		visited.push(endVertex);
		
		endVertex = NextNonexcludedVertex(endVertex, visited);
		
	} while (endVertex); // If we've still go at least one unvisited vertex, continue searching.	

	// At this point, the path's been tracked and is ready.

	return path;
}

function MarkCircuit(circuit) {
	for (var i = 0; i < circuit.length; i++) {
		let vertex = circuit[i];
		let $slot = vertex.edgeA.source;
		let $line = $slot.find("svg path.inline-" + vertex.edgeA.sourceVertexID);
		$line.css("stroke", "#F60");
		$line.css("stroke-width", "4px");
	}
}

function GetCircuit(vertex) {
	var visited = new Array();
	
	if (!vertex) return false; // If no vertex was passed, a loop is impossible.
	
	do {
		// Visit the current vertex, by getting source from an edge
		// Notice that they're both coming form the same vertex, meaning,
		// source is the same on vertex[0] and vertex[1]...
		visited.push(vertex);
		
		let vertexA = vertex.edgeA && vertex.edgeA.destination.data("edge")[vertex.edgeA.vertexID];
		let vertexB = vertex.edgeB && vertex.edgeB.destination.data("edge")[vertex.edgeB.vertexID];
		
		// It doesn't have two connections, it's not part of a circuit.
		if (!vertexA || !vertexB) return false;

		vertex = false; // Clear vertex and attempt to populate it based on vertexA or vertexB.

		// Go to the next unvisited neighbor, either vertexA or vertexB.
		// If all neighbor vertices have been visited, we've got a loop!
		if (visited.indexOf(vertexA) < 0) vertex = vertexA; 
		else
		if (visited.indexOf(vertexB) < 0) vertex = vertexB;
		
	} while (vertex); // If we've still go at least one unvisited vertex, continue checking.

	return visited;
}

function GetCircuits($target) {
	var circuits = new Array();
	for (var thisVertexID in $target.data("edge")) {
		let circuit = GetCircuit($target.data("edge")[thisVertexID]);
		circuits[thisVertexID] = circuit? circuit : false;
	}
	return circuits;	
}

function GetStraightCountFromCircuit(path) {
	var totalStraight = 0;
	for	(var i in path) {
		if (path[i].edgeA.vertexID == 1) totalStraight += 1;
		if (path[i].edgeB.vertexID == 1) totalStraight += 1;
	}
	return totalStraight / 2;
}

function GetStraightMaxAdjacentCountFromCircuit(path) {
	var globalMaximum = 0;
	var localMaximum = 0;
	for (var i = 0; i < path.length || (localMaximum > 0 && i < path.length * 2); i++) {
		let thisVertex = path[i % path.length];
		let thatVertex = path[(i + 1) % path.length];
		
		thisVertex.edgeA.source.css("border", "1px solid red");
		thatVertex.edgeA.source.css("border", "1px solid red");
		
		let thisEdge = (thisVertex.edgeA.destination[0] === thatVertex.edgeA.source[0])? thisVertex.edgeA : thisVertex.edgeB;
		let thatEdge = (thatVertex.edgeA.destination[0] === thisVertex.edgeA.source[0])? thatVertex.edgeA : thatVertex.edgeB;
		
		if (thisEdge.vertexID != 1 || thatEdge.vertexID != 1) {
			if (localMaximum > globalMaximum) globalMaximum = localMaximum; 
			localMaximum = 0;
		} else localMaximum++;
		
		
		thisVertex.edgeA.source.css("border", "none");
		thatVertex.edgeA.source.css("border", "none");
	}
	return (globalMaximum > 0)? globalMaximum + 1 : 0;
}

function GetWinnerFromTarget($target, highlight) {
	let requiredStraightsMinimal = $("#setting-straights-minimal button[data-reset]").data("level");
	let requiredStraigthsAdjacent = $("#setting-straights-adjacent button[data-reset]").data("level");
	
	let circuits = GetCircuits($target);
	
	// All will be initially assumed to not be candidates.
	var candidateCircuit = [false, false, false];
	
	for (var c = 0; c < circuits.length; c++) {
		if (!circuits[c]) continue;
		if (GetStraightCountFromCircuit(circuits[c]) < requiredStraightsMinimal) continue;
		if (GetStraightMaxAdjacentCountFromCircuit(circuits[c]) < requiredStraigthsAdjacent) continue;
		candidateCircuit[c] = true;
	}
	
	//let playerACircuit = circuits[0]? [0] : ((circuits[1] && circuits[2])? [1, 2] : false);
	//let playerBCircuit = circuits[2]? [2] : ((circuits[1] && circuits[0])? [1, 0] : false);
	let playerACircuit = circuits[0]? 0 : ((circuits[1] && circuits[2])? 1 : false);
	let playerBCircuit = circuits[2]? 2 : ((circuits[1] && circuits[0])? 1 : false);
	
	var playerAWon = false;
	var playerBWon = false;
	
	//if (typeof playerACircuit == "object" && candidateCircuit[playerACircuit[0]]) playerAWon = true;
	//if (typeof playerBCircuit == "object" && candidateCircuit[playerBCircuit[0]]) playerBWon = true;
	if (typeof playerACircuit == "number" && candidateCircuit[playerACircuit]) playerAWon = true;
	if (typeof playerBCircuit == "number" && candidateCircuit[playerBCircuit]) playerBWon = true;
	
	//if (playerAWon) for (var x = 0; x < playerACircuit.length; x++) {console.log("PA Marking: " + playerACircuit[x]); MarkCircuit(circuits[playerACircuit[x]]);}
	//if (playerBWon) for (var y = 0; y < playerBCircuit.length; y++) {console.log("PB Marking: " + playerBCircuit[y]); MarkCircuit(circuits[playerBCircuit[y]]);}
	if (playerAWon && highlight) MarkCircuit(circuits[playerACircuit]);
	if (playerBWon && highlight) MarkCircuit(circuits[playerBCircuit]);
	
	if (playerAWon && playerBWon) return "Opponent";
	
	if (playerAWon) return "Player 1";
	if (playerBWon) return "Player 2";
	
	return false;
}

function VertexIDForFaceID($piece, faceID) {
	let map = [[[1, 2], [0, 3], [4, 5]], [[3, 4], [2, 5], [0, 1]], [[0, 5], [1, 4], [2, 3]]][$piece.data("orientation") || 0]; 
	
	for (var i = 0; i < map.length; i++) {
		if (map[i].indexOf(faceID) >= 0) return i;
	}
}

function SpotNeighborsLink($spot, neighbors) {	
	// Make edges between vertices on valid neighboring tiles.
	for (var thisFaceID = 0; thisFaceID < neighbors.length; thisFaceID++) {
		let $neighbor = neighbors[thisFaceID] && $(neighbors[thisFaceID]);
		
		// We only setup existing neighbors that are in use, skip the rest.
		if (!$neighbor || !$neighbor.attr("data-played")) continue;
		
		// Determine our neighbor's face facing us (neighbor side connecting us).
		let thatFaceID = (thisFaceID + 3) % 6;
		
		// Determine the vertex we're dealing with, based on the face of the pieces.
		// These are different since different faces connect to different vertices.
		let thisVertexID = VertexIDForFaceID($spot, thisFaceID);
		let thatVertexID = VertexIDForFaceID($neighbor, thatFaceID);
		
		let thisVertex = $spot.data("edge")[thisVertexID];
		let thatVertex = $neighbor.data("edge")[thatVertexID];
		
		// Push new edges to both pieces.
		if (!thisVertex.edgeA) thisVertex.edgeA = {source:$spot, sourceVertexID:thisVertexID, destination:$neighbor, vertexID:thatVertexID};
		else
		if (!thisVertex.edgeB) thisVertex.edgeB = {source:$spot, sourceVertexID:thisVertexID, destination:$neighbor, vertexID:thatVertexID};
		/*else {
			console.log("No this.edges available:");
			console.log("EdgeA:");
			console.log(thisVertex.edgeA);
			console.log("EdgeB:");
			console.log(thisVertex.edgeB);
		}*/
		
		if (!thatVertex.edgeA) thatVertex.edgeA = {source:$neighbor, sourceVertexID:thatVertexID, destination:$spot, vertexID:thisVertexID};
		else
		if (!thatVertex.edgeB) thatVertex.edgeB = {source:$neighbor, sourceVertexID:thatVertexID, destination:$spot, vertexID:thisVertexID};
		/*else {
			console.log("No that.edges available:");
			console.log("EdgeA:");
			console.log(thatVertex.edgeA);
			console.log("EdgeB:");
			console.log(thatVertex.edgeB);
		}*/
		
		//console.log("LINKED:");
		//console.log($spot);
		//console.log($neighbor);
	}
}

function SpotNeighborsUnlink($spot, neighbors) {		
	// Make edges between vertices on valid neighboring tiles.
	for (var thisFaceID = 0; thisFaceID < neighbors.length; thisFaceID++) {
		let $neighbor = neighbors[thisFaceID] && $(neighbors[thisFaceID]);
		
		// We only setup existing neighbors that are in use, skip the rest.
		if (!$neighbor || !$neighbor.attr("data-played")) continue;
		//if (!$neighbor) continue;
		
		// Determine our neighbor's face facing us (neighbor side connecting us).
		let thatFaceID = (thisFaceID + 3) % 6;
		
		// Determine the vertex we're dealing with, based on the face of the pieces.
		// These are different since different faces connect to different vertices.
		let thisVertexID = VertexIDForFaceID($spot, thisFaceID);
		let thatVertexID = VertexIDForFaceID($neighbor, thatFaceID);
		
		let thisVertex = $spot.data("edge")[thisVertexID];
		let thatVertex = $neighbor.data("edge")[thatVertexID];
		
		// Clear out the vertices if they're used.
		if (thisVertex.edgeA) thisVertex.edgeA = false;
		if (thisVertex.edgeB) thisVertex.edgeB = false;
		
		//console.log("Attempting to unlink tiles:");
		//console.log($spot);
		//console.log($neighbor);
		
		//console.log("Unlinked this.edges:");
		//console.log($spot.data("edge")[thisVertexID].edgeA);
		//console.log($spot.data("edge")[thisVertexID].edgeB);
		
		// If any verticies are linked to this one, clear them out.
		if (thatVertex.edgeA && thatVertex.edgeA.destination === $spot) thatVertex.edgeA = false;
		if (thatVertex.edgeB && thatVertex.edgeB.destination === $spot) thatVertex.edgeB = false;
		
		if (thatVertex.edgeA && thatVertex.edgeB) {
			console.log("FAILURE: Unable to unlink that.edges,");
			console.log($spot);
			console.log($neighbor);
			console.log($neighbor.data("edge")[thatVertexID].edgeA);
			console.log($neighbor.data("edge")[thatVertexID].edgeB);
		}
		
		//console.log("Unlinked that.edges:");
		//console.log($neighbor.data("edge")[thatVertexID].edgeA);
		//console.log($neighbor.data("edge")[thatVertexID].edgeB);
	}
}

function GetPathDefensiveValue(path, playerID) {
	var value = 0;
	
	let vertexID = playerID == "Player 1"? [0, 1] : [1, 2];
	
	for (var i = 0; i < path.length; i++) {
		let vertex = path[i];
		
		if (!vertex.edgeA && !vertex.edgeB) continue;
		
		let $vertexSource = vertex.edgeA? vertex.edgeA.source : vertex.edgeB.source;
		
		for (var j = 0; j < vertexID.length; j++) {
			// Notice: If the inversion below is removed this becomes offensive.
			if (!$vertexSource.data("edge")[vertexID[j]].edgeA) value++;
			if (!$vertexSource.data("edge")[vertexID[j]].edgeB) value++;
		}	
	}
	
	return value;
}

function SimulateMovesByNeighborForPlayerID($originSpot, $startSpot, playerID, depth) {	
	if (!$originSpot.length) {console.log("Missing origin point, can't play..."); return;}
	if (!$startSpot.length) {console.log("Missing start point, can't play..."); return;}
	if (playerID != "Player 1" && playerID != "Player 2") {console.log("Invalid search player ID!"); return;}
	if (typeof depth != "number" || depth < 0) {console.log("Invalid search depth!"); return;}
	
	if (!depth) return; // Base case
	
	let candiateNeighbors = Neighbors($startSpot);

	let $candidateSpots = $(ValidNeighbors(candiateNeighbors)).filter(":not([data-played])");
	
	let candidateVertices = playerID == "Player 1"? [0, 1] : [1, 2];

	var strategy = false;

	if (!$candidateSpots.length) {console.log("No playable neighbors, can't play!"); return;}

	$candidateSpots.each(function(i) {
		let $candidate = $(this);
		let $candidateRotationBtn = $candidate.find("button:not([data-play])").eq(1);
		let neighbors = Neighbors($candidate);
		
		for (var i = 0; i < 3; i++) {
			$candidateRotationBtn.trigger("click"); // Rotate to check all orientations.
			
			// Link and mark as played
			$candidate.attr("data-played", true); // Set flag temporarily.
			SpotNeighborsLink($candidate, neighbors);
			
			let winnerPlayerID = GetWinnerFromTarget($candidate);
			
			// Check if we've got a winning strategy right now.
			let winningStrategy = winnerPlayerID == playerID? {
				winner: true, // Defense strategy, not winning strategy.
				moves: [{target: $candidate, orientation: $candidate.data("orientation")}],
				value: -1 // Does not matter if it's a winning strategy.
			} : false;
			
			// Only check the current piece-orientation combination if we've got no winner
			// but skip if the combination yields a winning strategy for the opponent.
			if (!winningStrategy) {
				
				if (!winnerPlayerID) {					
					if (depth > 1) {
						let longerStrategy = SimulateMovesByNeighborForPlayerID($originSpot, $candidate, playerID, depth - 1);
						longerStrategy.moves.push({target: $candidate, orientation: $candidate.data("orientation")});
						
						if (!longerStrategy.winner && (!strategy || strategy.value < longerStrategy.value)) strategy = longerStrategy;
						
					} else {				
						for (var j = 0; j < candidateVertices.length; j++) {
							let path = GetPath($originSpot.data("edge")[candidateVertices[j]]);
							let candidateDefensiveValue = GetPathDefensiveValue(path, playerID);
							
							if (!strategy || strategy.value < candidateDefensiveValue) strategy = {
								winner: false, // Defense strategy, not winning strategy.
								moves: [{target: $candidate, orientation: $candidate.data("orientation")}],
								value: candidateDefensiveValue
							};
						}
					}
				} else console.log("Found opponent winning strategy, killing permutations.");
				
			} else strategy = winningStrategy;
			
			
			// Unlink and unmark as played
			SpotNeighborsUnlink($candidate, neighbors);
			$candidate.removeAttr("data-played"); // Reset flag.
			
			if (winningStrategy || strategy.winner) return false; // Stop the loop if we've got a winning strategy.
		}
	});
	
	return strategy;
}

// Tile Controller Logic ==========================================
// ================================================================
function $MakePiece(playable, playedEvent) {
	let $board = $("body>div#board");
	
	let $li = $($("#t-piece").html());
	let $controls = $li.find("div.btn-group");
	let $piece = $li.find("svg");

	$controls.find("button[data-play]").click(function(event) {
		// Prepare all variables.
		let $this = $(this);
		
		// Get the piece container/slot 
		let $spot = $li; //$this.closest("li");
		
		// Make sure this spot hasn't already been played.
		if ($spot.attr("data-played")) {console.log("Already played, not playable:"); console.log($spot); return;};
		
		// Get the parent of the spot/slot.
		let $column = $spot.closest("ul");
		
		// If a conditional function was passed, check if the spot is playable.
		if (playable && !playable($spot)) {console.log("Not playable!"); return;}
		
		// Assure board is properly expanded depending on which spot was used.
		// Check if the left-most column was used and add another column if so.
		if ($($board.children().first()).is($column)) {
			let $list = $("<ul>").addClass($column.hasClass("offset")? "" : "offset");
			$column.children().each(function(i) {
				$list.append($MakePiece(playable, playedEvent));
			});
			$board.prepend($list);
		}
		
		// Check if the right-most column was used and add another column if so.
		if ($($board.children().last()).is($column)) {
			let $list = $("<ul>").addClass($column.hasClass("offset")? "" : "offset");
			$column.children().each(function(i) {
				$list.append($MakePiece(playable, playedEvent));
			});
			$board.append($list);
		}
		
		// Check if one of the top-most elements was used, add another.
		if ($($column.children().first()).is($spot)) {
			$board.children().each(function(i) {
				$(this).prepend($MakePiece(playable, playedEvent));
			});
		}
		
		// Check if one of the bottom-most elements was used, add another.
		if ($($column.children().last()).is($spot)) {
			$board.children().each(function(i) {
				$(this).append($MakePiece(playable, playedEvent));
			});
		}
		
		// Gather all neighboring li elements
		let neighbors = Neighbors($spot);
		
		// After playing the piece, all adjacent neighbors are also enabled.
		for (var i = 0; i < neighbors.length; i++) {
			if (neighbors[i]) $(neighbors[i]).attr("disabled", false);
		}
		
		SpotNeighborsLink($spot, neighbors);
		
		// Update last played to this one.
		$board.data("previous-spot", $spot);
		
		// Mark the spot as played.
		$spot.attr("data-played", true);
		
		if (playedEvent) playedEvent($spot);
	});
	
	$controls.find("button:not([data-play])").click(function(event) {
		let $this = $(this);
		let rotation = ($piece.data("rotation") || 0) + parseInt($this.attr("data-offset"));
		let orientation = (rotation / 120) % 3;
		$piece.data("rotation", rotation);
		$li.data("orientation", orientation < 0? 3 + orientation : orientation);
		$piece.css("transform", "rotate(" + rotation + "deg)");
	});
	
	// Initialize variables for edges/vertices.
	$li.data("edge", [
		{edgeA:false, edgeB:false}, 
		{edgeA:false, edgeB:false}, 
		{edgeA:false, edgeB:false}
	]);
	
	return $li;
}

$(function() {
	// Settings Interface Logic =======================================
	// ================================================================
	$("#setting-unit-count button[data-reset]").data({level:48, levelStart:48, levelMinimum:48, label:" Available"});
	$("#setting-tiles-turn button[data-reset]").data({level:2, levelStart:2, levelMinimum:2, label:" Per Turn"});
	$("#setting-tiles-adjacent button[data-reset]").data({level:1, levelStart:1, levelMinimum:1, label:" Adjacent"});
	$("#setting-straights-minimal button[data-reset]").data({level:1, levelStart:1, levelMinimum:1, label:" Required"});
	$("#setting-straights-adjacent button[data-reset]").data({level:0, levelStart:0, levelMinimum:0, label:" Adjacent"});
	
	$("#setting-unit-count button, #setting-tiles-turn button, #setting-tiles-adjacent button, #setting-straights-minimal button, #setting-straights-adjacent button").not("[data-reset]").click(function(event) {
		let $display = $(this).closest("div.btn-group-justified").find("button[data-reset]");
		
		let offset = $(this).attr("data-increment") !== undefined? 1 : ($(this).attr("data-decrement") !== undefined? -1 : 0);
		let result = $display.data("level") + offset;
		
		if (result >= $display.data("levelMinimum"))
		{
			$display.data("level", result);
			$display.text(result + $display.data("label"));
			$display.prop("disabled", (result == $display.data("levelMinimum")));
		}
	});
	
	$("#setting-unit-count button, #setting-tiles-turn button, #setting-tiles-adjacent button, #setting-straights-minimal button, #setting-straights-adjacent button").filter("[data-reset]").click(function(event) {
		let $this = $(this);
		$this.data("level", $this.data("levelStart")).text($this.data("level") + $this.data("label")).prop("disabled", true);
	});
	
	$("#setting-unit-count, #setting-tiles-turn").click(function(event) {
		UpdateTurnDisplay(Turn);
	});
	

	let $firstPiece = $MakePiece(
	function($spot) {
		let $board = $spot.closest("div#board");
		let $previousSpot = $board.data("previous-spot");
		
		// If we need x adjacent and we've got just enough peices, check if we're adjacent.
		if (Turn > 0 && GetPlayerIDFromTurn(Turn) == GetPlayerIDFromTurn(Turn - 1) && GetRemainingUnitsForTurn(Turn) <= GetRequiredAdjacentTilesPerTurn()) {
			let neighbors = Neighbors($spot);
			if (neighbors.indexOf($previousSpot[0]) < 0) {
				console.log("Piece not adjacent!"); 
				return false;
			}
		}
		
		return true;
	},
	function($spot) {
		UpdateTurnDisplay(++Turn);
		
		let winner = GetWinnerFromTarget($spot, true);
		if (winner) alert("The winner is " + winner);
		
		// If the board's out of pieces, it's a draw.
		if (Turn + 1 >= GetBoardUnitCount() || winner)
			$("body>div#board").attr("disabled", true);
			
		if ($("#ai-button").data("active") && GetPlayerIDFromTurn(Turn) == 1 && GetPlayerTurnFromTurn(Turn) == 0) {
			let $board = $("body>div#board");

			let $strategy = SimulateMovesByNeighborForPlayerID($board.data("previous-spot"), $board.data("previous-spot"), "Player 2", GetTilesPerTurn());
			$strategy.moves.reverse(); // Start from the first to last.
			
			for (var i = 0; i < $strategy.moves.length; i++) {
				let $target = $strategy.moves[i].target;
				let orientation = $strategy.moves[i].orientation;
				let $targetRotateBtn = $target.find("button:not([data-play])").eq(1);
				while ($target.data("orientation") != orientation) $targetRotateBtn.trigger("click");
				$target.find("button[data-play]").trigger("click");
			}
		}
	});
	
	
	$("#ai-button").click(function(event) {
		let currentState = $(this).data("active") || false;
		let newState = !currentState;
		$(this).text("AI: " + (newState? "ON" : "OFF"));
		$(this).removeClass(newState? "btn-default" : "btn-warning");
		$(this).addClass(newState? "btn-warning" : "btn-default");
		$(this).data("active", newState);
	})
	
	
	$firstPiece.attr("disabled", false);
	$("body>div#board").append($("<ul>").append($firstPiece));
	
	UpdateTurnDisplay(Turn);
});
