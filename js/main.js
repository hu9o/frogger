
var frogger = (function(){

    // Interface externe
	var frogger = 	{
						init:  function(canvas) { return game.init(canvas); },
						pause: function() { var p=game.pause(); if (p) popup.draw("- PAUSE -"); return p; },
						restart: function() { game.reset(); },
                        onPauseChange: null,
						controller: { up:  function() { game.move(0); },
									right: function() { game.move(1); },
									down:  function() { game.move(2); },
									left:  function() { game.move(3); }}
					};
                    
                    
    // Jeu et plateau
	var game = (function(){
		var game = new Object();
        
        var gameConstants = {
            lives: 3,
            time: 20,
            goalsPositions: [1, 5, 9, 13, 17],
            strings: {
                LOSE_TIME: ["YOU DIED FROM BOREDOM", "YOU JUST HAD A STROKE"],
                LOSE_ROAD: ["C'MON LOOK AT THAT MESS !", "TRY TO KEEP YOUR GUTS WITHIN YOU - GONNA NEED IT", "SPLASH !"],
                LOSE_RIVER: ["SRY. NO CAN SWIM.", "THIS WATER IS ACTUALLY ACID - GOT YOU !", "A FROG. SWIMMING. WHAT WERE YOU THINKING OF ?!"],
                LOSE_OUTOFMAP: ["WHERE ARE YOU GOING ?", "WOOT YOU FOUND THE SECRET LEVEL... NOT !", "! WRONG DIRECTION !"],
                LOSE_MISSGOAL: ["THAT WAS CLOSE", "HOW DID YOU MISS THAT ?!", "FUUUUU..."],
                GAMEOVER: ["PUT ON YOUR GLASSES AND TRY AGAIN. YOU SCORED %score% PTS", "%score% PTS - HAVING PSYCHOMOTOR ISSUES ?", "%score% PTS. YOU JUST LOST 'THE GAME' - WINK WINK !"],
                WIN: ["YOU BEAT THE GAME WITH %score% PTS !"]
            }
        }

		game.ctx;
		game.canvas;
		var dispList = new Array();
		var goalsLeft;
		var dummies;
		var scoreTxt, livesTxt, timeTxt;
		var score, lives, timeLeft;
		var livesStr;
		var frogMaxHeight;
		var lastPauseTime = 0;
		var totalPausedTime = 0;
        var nextMove;
		var paused = false;
        game.time;
		var startTime, lastFrameTime, timeElapsed, timeToFrame;
        var resumeTimeoutId = 0;
		
		var map;
		
		
		game.init = function(canvas) {
			var that = this;
			
			// get context
			try {
				game.canvas = canvas;
				game.ctx = game.canvas.getContext("2d");
			}
			catch (e) {
				console.log("Problème avec canvas");
				return;
			}
				
			// set map
			map = [
				{type: "goal"},
				{type: "road", objs:new Line(drawers.car, 1, -5, "==   ==          ")},
				{type: "road", objs:new Line(drawers.car, 2, 1.9,  "=   =   =      ")},
				{type: "road", objs:new Line(drawers.car, 3, -3.2, "=   =   =      ")},
				{type: "road", objs:new Line(drawers.car, 4, 2.4,  "=   =   =      ")},
				{type: "road", objs:new Line(drawers.car, 5, -2.1, "=   =   =      ")},
				{type: "safe"},
				{type: "river", objs:new Line(drawers.log, 7, 2.6,   "====  ====  ====    ")},
				{type: "river", objs:new Line(drawers.turtle, 8, -2.4,  "        ==  ==  ==  ==  ")},
				{type: "river", objs:new Line(drawers.log, 9, 2.8, "    ======  ======    ==")},
				{type: "river", objs:new Line(drawers.log, 10, 1.6,  "====      ===         ")},
				{type: "river", objs:new Line(drawers.turtle, 11, -2.3, "=== === === ===   ")},
				{type: "safe"},
				{type: "safe"},
				{type: "safe"}
			];
			
            popup.init();
            
			// objs
			var bg = new Sprite("assets/board.png");
							
			scoreTxt = new Text();
			livesTxt = new Text();
			timeTxt = new Text();
			livesTxt.align = "right";
			scoreTxt.x = 0;
			scoreTxt.y = this.canvas.height - 32;
			livesTxt.x = this.canvas.width - 12;
			livesTxt.y = this.canvas.height - 16;
			timeTxt.x = 0;
			timeTxt.y = this.canvas.height - 16;
			
			this.addChild(bg);
			this.addChild(bloodTrails);
			
			map.forEach(function(elem, i, arr){ if (elem.objs) that.addChild(elem.objs); });
			
			this.addChild(frog);
			this.addChild(scoreTxt);
			this.addChild(livesTxt);
			this.addChild(timeTxt);
			
			// START
			this.reset();
			
			// onenterframe
			this.update();
            
            game.mainLoop(false);
			setInterval(function(){ game.mainLoop(false); }, 10);
		};
		
        // Reset total
		game.reset = function() {
			setBoard();
			setScore(0);
			setLives(3);
			frogMaxHeight = 24;
            nextMove = -1;
			goalsLeft = gameConstants.goalsPositions.concat();
            
            if (dummies)
                dummies.forEach(function(elem, i, arr){ game.removeChild(elem); });
			dummies = [];
            
            bloodTrails.clear();
			
			// shuffle
			for (var k=utils.randBtw(200, 500); k>0; k--)
				tick();
		};
		
        // Redessine
		game.update = function() {
            if (!paused)
                draw();
                
			requestAnimationFrame(function(){ game.update(); });
		};
		
        // Alterner entre pause et play
		game.pause = function() {
			paused = !paused;
			
			if (paused)
            {
				lastPauseTime = this.time;
			}
            else
				totalPausedTime += this.time - lastPauseTime;
			
            if (frogger.onPauseChange)
                frogger.onPauseChange(paused);
                
            clearInterval(resumeTimeoutId);
            
			return paused;
		};		
		
        // Bouger le frog
		game.move = function(dir) {
            nextMove = dir;
		}
        
        // Boucle principale
        game.mainLoop = function(loop)
        {
            do
            {
                this.time = new Date().getTime();
                frameTime = this.time - lastFrameTime;
                timeElapsed = this.time - startTime;
                timeToFrame += frameTime;
                
                while (timeToFrame >= 40)
                {
                    timeToFrame -= 40;
                    lastFrameTime = this.time;
                    
                    if (!paused)
                    {
                        timeLeft = (((this.timeLimit - timeElapsed) + totalPausedTime) / 1000 << 0) + 1;
                        setTime(timeLeft);
                        if (timeLeft <= 0)
                            lose(gameConstants.strings.LOSE_TIME);
                    
                        tick();
                    }
                }
			}
            while (loop);
        }
		
        // Toutes les n millisecondes :
		var tick = function() {
            dispList.forEach(function(elem, i, arr){ if (elem.tick) elem.tick(); });
            
            // Selon le type de terrain :
            switch (map[frog.gridY].type)
            {
                case "river":
                    var platform = map[frog.gridY].objs;
                
                    if (!frog.leaping || frog.leapStartGridPosY == platform.gridY)
                    {
                        if (!frog.leaping && !platform.innerCollision(frog.x))
                            lose(gameConstants.strings.LOSE_RIVER);
                        else
                            frog.x += platform.speed;
                    }
                    break;
                
                case "road":
                    var collObj;
                    
                    if (collObj = map[frog.gridY].objs.outerCollision(frog.x)) {
                        collObj.blood = bloodTrails.begin(collObj.x, collObj.y, map[frog.gridY].objs.speed > 0 ? 1 : -1);
                        lose(gameConstants.strings.LOSE_ROAD);
                    }
                     
                    break;
                
                case "goal":
                    var frog_gridX = Math.round(frog.x/32);
                    var index = goalsLeft.indexOf(frog_gridX);
                
                    if (index != -1)
                    {
                        var dummy = new Sprite();
                        dummy.rect = new utils.Rect(32*2, 0, 32, 32);
                        dummy.x = frog_gridX * 32;
                        dummy.y = frog.gridY*32;
                        game.addChild(dummy);
                        goalsLeft.splice(index, 1);
                        
                        //utils.Tween.start(new Object(), {t: 1} , 0.8, function(){  }, null, function(obj, curr, stopAt){ obj.frame = Math.floor(curr*2/stopAt + 1); scoreDelta =  });
                        setScore(timeLeft, true);
                        
                        setBoard();
                        frogMaxHeight = 12;
                        dummies.push(dummy);
                        
                        if (!goalsLeft.length)
                            win();
                    }
                    else
                        lose(gameConstants.strings.LOSE_MISSGOAL);
                    break;
                    
                case "safe":
                    if (!frog.leaping)
                        frog.gotoGrid((frog.x/32+.5) << 0, (frog.y/32+.5) << 0);
                        
                    break;
            }
            
            // Déplacement du frog
            if (nextMove != -1)
            {
                if (frog.leap(nextMove))
                    nextMove = -1;
            }
            
            // Sort de la map
            if (Math.round(frog.x/32) < 0 || Math.round(frog.x/32) > 19)
                lose(gameConstants.strings.LOSE_OUTOFMAP);
            
            // Entre dans une nouvelle ligne
            if (frog.gridY < frogMaxHeight)
            {
                frogMaxHeight = frog.gridY;
                setScore(10, true);
            }
		};
		
		// Setters
		function setScore(n, rel) {
			score = rel? score+n : n;
			scoreTxt.str = "SCORE: " + score;
		};
		function setLives(n, rel) {
			livesStr = rel? livesStr : "";
			
			if (n > 0)
				while (n--) livesStr += "*";
			else
				while (n++ && livesStr.length) livesStr = livesStr.substr(1);
			
			lives = livesStr.length;
			livesTxt.str = "EXTRA LIVES: " + livesStr.substr(1);
		};
		function setTime(n, rel) {
            var timeStr = rel? timeStr : "";
            
            n = (n*40/gameConstants.time) << 0;
            
            if (n > 0)
                while (n--) timeStr += "=";
            else
                while (n++ && timeStr.length) timeStr = timeStr.substr(1);
            
            timeTxt.str = "TIME LEFT: " + timeStr;
		};
		
		function lose(msg) {
			setBoard();
			setLives(-1, true);
            
			if (livesStr.length) {
                if (utils.isOfType(msg, "Array")) // if the message is an array, pick one value at random
                    msg = utils.randInArr(msg);
                
                game.pause();
                popup.draw(msg);
                
                resumeTimeoutId = setTimeout(function(){ game.pause(); }, 2000);
            }
            else {
                var scoreBeforeReset = score;
				game.reset();
                
                game.pause();
                popup.draw(utils.replaceArgs(utils.randInArr(gameConstants.strings.GAMEOVER), {score: scoreBeforeReset}));
			}
		};
		
		function win() {
			setBoard();
			setScore(100, true);
            var scoreBeforeReset = score;
			
			game.reset();
            game.pause();
            popup.draw(utils.replaceArgs(utils.randInArr(gameConstants.strings.WIN), {score: scoreBeforeReset}));
		};
		
        // Reset partiel (ex: quand on meurt)
		function setBoard() {
			this.time = startTime = lastFrameTime = new Date().getTime();
			timeElapsed = timeToFrame = lastPauseTime = totalPausedTime = 0;
			game.timeLimit = gameConstants.time * 1000;
			paused = false;
            nextMove = -1;
			
			frog.reset(9, 12);
		};
		
        // Liste d'affichage
		game.getChildAt = function(i){ return dispList[(i<0)? dispList.length+i : i]; }
		game.addChild = function(sprite){ dispList.push(sprite); }
		game.removeChild = function(sprite){ dispList = dispList.filter(function(elem, i, arr){ return elem != sprite }); }
		//game.swapChildren = function(a, b){ dispList = dispList.map(function(elem, i, arr){ elem != sprite }); }
		var draw = function(){ dispList.forEach(function(elem, i, arr){ elem.draw(); }); };
        
        
		game.getCollisionAt = function(x, y){ return (x<0 || x>=20*32 || y<0 || y>=14*32)? "solid":"void"; };

		return game;
	})();


	var Sprite = (function(){
		function _class(imgpath)
		{
			this.x = 0;
			this.y = 0;
			this.img = new Image();
			this.img.src = imgpath? imgpath : "assets/tileset.png";
			this.rect = null;
		}

		_class.prototype.draw = function(){
			if (!this.rect)
				game.ctx.drawImage(this.img, this.x, this.y);
			else
				game.ctx.drawImage(this.img, this.rect.x, this.rect.y, this.rect.w, this.rect.h, this.x, this.y, this.rect.w, this.rect.h);
		};
		
		return _class;
	})();

	var frog = (function(){
		var _this = new Sprite();

		_this.leapStartGridPosY = 0;
		_this.deltaX = 0;
		_this.deltaY = 0;
		_this.dir = 0;
		_this.frame = 0;
		_this.leaping = false;
		
		_this.leap = function(dir){
			if (this._tween_id == undefined)
			{
				this.dir = dir;
				var diff = new utils.Point((dir==1)-(dir==3), (dir==2)-(dir==0));
				
				var dist = 32;
				//while (game.getCollisionAt(this.x+diff.x*dist, this.y+diff.y*dist) != "void") dist--;
				
				if (game.getCollisionAt(this.x+diff.x*dist, this.y+diff.y*dist) != "solid")
				{
					this.leapStartGridPosY = this.gridY;
					this.gridY += diff.y;
					
					this.x += diff.x*dist/2;
					this.y += diff.y*dist/2;
					this.deltaX = -diff.x*dist/2;
					this.deltaY = -diff.y*dist/2;
					
					var that = this;
					this.leaping = true;
					utils.Tween.start(this, {deltaX: diff.x*dist/2, deltaY: diff.y*dist/2} , 0.4, function(){ that.leaping=false; that.x+=that.deltaX; that.y+=that.deltaY; that.deltaX=that.deltaY=0; }, null, function(obj, curr, stopAt){ obj.frame = Math.floor(curr*2/stopAt + 1); });
				}
                
                return true;
			}
            
            return false;
		};
		
		_this.gotoGrid = function(x, y){
			this.gridY = y;
			this.x = x * 32;
			this.y = y * 32;
		};
		
		_this.draw = function(){
			game.ctx.drawImage(this.img, this.dir*32, (this.frame%3)*32, 32, 32, this.x+this.deltaX, this.y+this.deltaY, 32, 32);
		};
		
		_this.reset = function(x, y){
			if (this._tween_id != undefined)
			{
				clearInterval(this._tween_id);
				delete this._tween_id;
			}
			
			this.deltaX = 0;
			this.deltaY = 0;
			this.dir = 0;
			this.frame = 0;
			this.gotoGrid(x, y);
			this.leapStartGridPosY = y;
		};
		
		return _this;
	})();

	var Line = (function(){
		function _class(drawer, gridY, speed, str){
			this.gridY = gridY;
			this.speed = speed;
			this.pos = 0;
			this.posMod = 0;
			this.str = str||"==  ";
			this.objList = new Array();
			this.drawer = drawer;
		}
		
		_class.prototype.tick = function(){
			var speedGtZero = (this.speed > 0);
		
			this.posMod += speedGtZero? this.speed : -this.speed;
			
			if (this.posMod >= 32)
			{
				var i = this.pos%this.str.length;
				if (this.str.charAt(i) == "=" && (i == 0 || this.str.charAt(i-1) == ' '))
				{
					var n = 0;
					while (this.str.charAt(i+n) == "=") n++;
				
					var obj = {};
					obj.x = speedGtZero? -n*32 - 32 + this.posMod : game.canvas.width;
					obj.y = this.gridY*32 - 2;
					obj.size = n;
					obj.speed = this.speed;
					obj.width = n*32;
					obj.id = utils.rand(128);
					this.objList.push(obj);
				}
				
				this.posMod -= 32;
				this.pos++;
			}                
			
			for (var j=this.objList.length-1; j>=0; j--)
			{
				var elem = this.objList[j];
				elem.x += this.speed;
                
                if (elem.blood)
                {
                    elem.blood = bloodTrails.end(elem.blood, elem.x);
                }
				
				if (speedGtZero? (elem.x > game.canvas.width) : (elem.x < -elem.width)) {
					this.objList.splice(j, 1);
				}
			}
		};
		
		_class.prototype.draw = function(){
			for (var j=this.objList.length-1; j>=0; j--)
			{
				var obj = this.objList[j];
				this.drawer.draw(obj.size, obj.x, obj.y, (obj.speed > 0)? 1 : -1, obj.id);
			}
		};
		
		_class.prototype.innerCollision = function(x){
			var list = this.objList.filter(function(elem, i, arr){
				return x >= elem.x-12 && x <= elem.x+elem.width-16;
			});
			
			return list.length > 0 ? list[0] : null;
		};
		_class.prototype.outerCollision = function(x){
			var list = this.objList.filter(function(elem, i, arr){
				return x >= elem.x-20 && x <= elem.x+elem.width-8;
			});
			
			return list.length > 0 ? list[0] : null;
		};

		return _class;
	})();

	var Text = (function(){
		var img = new Sprite();
		img.rect = new utils.Rect(0, 0, 7, 7);
		
		function _class(str, align)
		{
			this.str = str||"";
			this.x = 0;
			this.y = 0;
			this.align = align||"left";
		};
		
		_class.prototype.chartable = "0123456789?!ABCDEFGHIJ.-KLMNOPQRST' UVWXYZ= :*";
		
		_class.prototype.draw = function(){
			var x=this.x, y=this.y;
			var len = this.str.length*8 - 2;
			
			img.x = (this.align == "center")? x-len/2-8 << 0 : ((this.align == "right")? x-len-8 : x);
			img.y = y;
			
			for (i=0; i<this.str.length; i++)
			{
				var charpos = this.chartable.indexOf(this.str.charAt(i));
				
				if (charpos == -1)
					continue;
				else
				{
					img.rect.x = (charpos%12) * 16;
					img.rect.y = 192 + Math.floor(charpos/12) * 8;
					img.x += 8;
					
					img.draw();
				}
			
			}
		}
		

		return _class;
	})();
    
    var drawers = {
        log : (function(){
            var _obj = new Object();
            var sprite = new Sprite();
            
            _obj.draw = function(n, x, y)
            {
                sprite.x = x >> 0;
                sprite.y = y >> 0;
                
                sprite.rect = new utils.Rect(128, 0, 16, 32);
                sprite.draw();
                
                sprite.x -= 16;
                while (n-1 > 0)
                {
                    sprite.rect.y = 32;
                    sprite.rect.w = 32;
                    sprite.x += 32;
                    sprite.draw();
                    
                    n--;
                }
                
                sprite.rect.x += 16;
                sprite.rect.y = 0;
                sprite.rect.w = 16;
                sprite.x += 32;
                
                sprite.draw();
            };

            return _obj;
        })(),

        turtle : (function(){
            var _obj = new Object();
            var sprite = new Sprite();
            
            _obj.draw = function(n, x, y)
            {
                sprite.x = x >> 0;
                sprite.y = y >> 0;
                
                sprite.rect = new utils.Rect(160, 32*Math.floor((game.time%(3*250))/250), 32, 32);
                
                while (n > 0)
                {
                    sprite.draw();
                    sprite.x += 32;
                    
                    n--;
                }
            };

            return _obj;
        })(),

        car : (function(){
            var _obj = new Object();
            var sprite = new Sprite();
            
            _obj.draw = function(n, x, y, dir, id)
            {
                sprite.x = x >> 0;
                sprite.y = y >> 0;
                var dir = ((-dir||1)+1)*16;
                
                if (n == 2)
                    sprite.rect = new utils.Rect(4*32, 128+dir, 64, 32);
                else
                    sprite.rect = new utils.Rect((id%4) * 32, 128+dir, 32, 32);
                
                sprite.draw();
            };

            return _obj;
        })()
    };
    
    var bloodTrails = (function(){
		var _obj = new Object();
        var trails = new Array();
        var sprite = new Sprite();
        var currId = 1;
    
		_obj.begin = function(x, y, dir) { // débute la traînée, renvoie son id.
            trails.push({id: currId, x:x, y:y, dir:dir, endX:x+1});
            return currId++;
		};
		_obj.end = function(id, x) { // définit la fin de la traînée à l'id donné ; renvoie l'id si elle continue, 0 sinon.
            var obj = trails.filter(function(obj){ return obj.id == id; })[0];
            
            if (!obj)
                return 0;
            
            obj.endX = x;
            
            if (Math.abs(obj.x - obj.endX) < 96) {
                return id;
            } else {
                obj.endX = obj.x + obj.dir*96;
                return 0;
            }
		};
        
		_obj.clear = function() { // efface toutes les traînées
            trails = new Array();
		};
        
		_obj.draw = function() {
            for (var i=0; i<trails.length; i++) {
                var obj = trails[i];
                var goingLeft = (obj.dir == -1);
            
                sprite.x = goingLeft? obj.endX : obj.x;
                sprite.y = obj.y;
                sprite.rect.x = goingLeft? 96-Math.abs(obj.x - obj.endX) : 96;
                sprite.rect.w = Math.abs(obj.x - obj.endX);
                sprite.draw();
            }
		};
        
        sprite.rect = new utils.Rect(0, 256, 1, 32);

		return _obj;
    })();
    
    var popup = (function(){
        var obj = new Object();
        var center = new utils.Point(0, 0);
        
        var pressSpace = new Text(":PRESS SPACE:", "center");
        obj.text = new Text("", "center");
        
        obj.init = function(){
            center.x = game.canvas.width/2;
            center.y = game.canvas.height/2;
            
            this.text.x = pressSpace.x = center.x;
            this.text.y = center.y - 12 - 4;
            pressSpace.y = center.y + 12 - 4;
        }
        
        obj.draw = function(msg){
            var w = 2;
            var nbBorders = 4;
            
            this.text.str = msg||"";
            width = 48 + Math.max(this.text.str.length*8, pressSpace.str.length*8);
            width -= width%2;      
            height = 48 + 8 + 24;
        
            for (var i=0; i<nbBorders; i++) {
                game.ctx.fillStyle = i%2? "black" : "#dedef7";
                game.ctx.fillRect(center.x - width/2 + w*i - w*nbBorders, center.y - height/2 + w*i - w*nbBorders, width - w*i*2 + w*nbBorders*2, height - w*i*2 + w*nbBorders*2);
            }
            
            this.text.draw();
            pressSpace.draw();
        }
        
        return obj;
    })();
	
	return frogger;
})();
