var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');
var express = require('express'),
    app = express();
    io = require('socket.io').listen("3000");
var rc522 = require("rc522");
var PythonShell = require('python-shell');
var gpio = require('rpi-gpio'); 

var pin   = 26;
var delay = 500;
var count = 0;
var max   = 1;

function on() {
    if (count >= max) {
	count = 0
        return;
    }
 
    setTimeout(function() {
        gpio.write(pin, 1, off);
        count += 1;
    }, delay);
}
 
function off() {
    setTimeout(function() {
        gpio.write(pin, 0, on);
    }, delay);
}



var path = require('path');

var bodyParser = require('body-parser');

var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/ayudantes');

var AyudantesSchema = new mongoose.Schema({
  acceso: {fecha:Date},
  bloques: {bloque:String,hora:Number},
  fechaRegistro: Date,
  keyTarjeta: String,
  mail: String,
  matricula: String,
  nombre: String,
  rut: String,
});

var Ayudantes = mongoose.model('Ayudantes', AyudantesSchema);

var SchemaUser = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var Account = new SchemaUser({
    username: String,
    password: String
});

Account.plugin(passportLocalMongoose);

var Account  = mongoose.model('accounts', Account);


//console.log("App successfully launched!");

//app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(flash());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
// Create a sample login page @ http://localhost:80
//app.get('/', function(req, res){
	//res.sendFile(__dirname + '/rfid2.html');
//});

passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());



app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

app.get('/ayudantes', function(req, res, next) {
	Ayudantes.find({},'',function (err, ayudantes) {
	  if (err) return console.error(err);
      
	  var json1 = JSON.stringify({ 
			data: ayudantes, 
		  });
	  
	  res.send(json1);

	});
});
app.post('/register', function(req, res, next) {
    Account.register(new Account({ username : req.body.username }), req.body.password, function(err, account) {
        if (err) {
          return res.render('register', { error : err.message });
        }

        passport.authenticate('local')(req, res, function () {
            req.session.save(function (err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        });
    });
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }), function(req, res, next) {
    req.session.save(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/pages/index.html');
    });
});

app.get('/ayudantes2', function(req, res, next) {
	Ayudantes.find({},'',function (err, ayudantes) {
	  if (err) return console.error(err);
      
	  var json1 = JSON.stringify(
			ayudantes
		  );
	  
	  res.send(json1);

	});
});

app.post('/delete', function(req, res, next) {
    if (!req.isAuthenticated()){
           var json = JSON.stringify({data:"Usuario no autenticado- accion prohibida"});
           res.send(json);

    }

    else
	Ayudantes.remove({ keyTarjeta: req.body.keyTarjeta }, function(err) {
			if (!err) {
					var json1 = JSON.stringify({ 
						data: 'Eliminado', 
					  });			
				}
			else {
					var json1 = JSON.stringify({ 
						data: 'Error', 
					  });
					
			}
			res.send(json1);
		});
});

var exec = require('child_process').exec;
var cmd = 'omxplayer /home/pi/SISTEMA_NFC/Bleep-SoundBible.com-1927126940.mp3 > test.txt';



// Everytime you tag in this will be triggered.
rc522(function(rfidSerialNumber){
//	console.log(rfidSerialNumber);
	io.sockets.emit("rfid", rfidSerialNumber); // Sends the RFID Serial Number through Socket.IO
  //	console.log(rfidSerialNumber);
 	
//	console.log("Leido");
//	console.log("Termino Update");
	Ayudantes.findOneAndUpdate(
	    {"keyTarjeta":rfidSerialNumber},
	    {$push: {"acceso": {fecha: new Date()}}},
	    {safe: true, upsert: false},
		function(err, model) {
			//console.log(err);
		}
	);
  //	console.log("Termino Update");
	gpio.setup(pin, gpio.DIR_OUT, on);	
	exec(cmd, function(error, stdout, stderr) {
		// command output is in stdout
	});

});

// Guardar Ayudante
// method post
app.post('/registro', function(req, res, next) {  
//	console.log("Solicitud de creacion de ayudante.");
//	console.log(req.body.keycard);
    if (!req.isAuthenticated()){
           var json = JSON.stringify({data:"Usuario no autenticado- accion prohibida"});
           res.send(json);

    }

    else
	Ayudantes.findOne({keyTarjeta:req.body.keycard},'_id nombre rut matricula mail keyTarjeta',function (err, ayudantes) {
		if (err)return console.error(err);
		if (ayudantes!=null){
				var json1 = JSON.stringify({ 
					data: "Tarjeta ya ha sido registrada", 
				});
				res.send(json1);
		}
		else{

				
			Ayudantes.create({
				  keyTarjeta: req.body.keycard,
				  mail: req.body.mail,
				  matricula: req.body.matricula,
				  nombre: req.body.nombreAyudante,
				  rut: req.body.rut,
				  fechaRegistro: new Date(),
			}, function(err, todo){
				if(err) {
					res.send(err);
				}
				else{
					var json1 = JSON.stringify({ 
						data: "Ayudante Registrado", 
					});

					res.send(json1);
				}
			});
		}
	});
});

// Obtener Ayudantes y bloques
// method get
app.get('/obtener_ayudantes_bloques', function(req, res, next) {  
//	console.log("Solicitud de creacion de ayudante.");
//	console.log(req.body.keycard);
	Ayudantes.find({},'nombre bloques',function (err, ayudantes) {
		if (err) res.send(err);
		if (ayudantes!=null){
				var json1 = JSON.stringify(
					ayudantes
				);
				//console.log(ayudantes);
				res.send(json1);
		}
	});
});

// Obtener total de ayudantes
// method get
app.get('/contar_ayudantes', function(req, res, next) {
//      console.log("contar ayudantes.");
      Ayudantes.find().count(function(err, count) {
                if (err) res.send(err);
                if (count!=null){
                                var json1 = JSON.stringify(
                                     { data: count}
                                );
                                //console.log(count);
                                res.send(json1);
                }
       
      });
});

// Obtener ayudante actual
// method get
app.get('/ayudante_actual', function(req, res, next) {
//      console.log("ayudante actual");
          var array_bloque = ["domingo-b","lunes-b", "martes-b", "miercoles-b", "jueves-b", "viernes-b","sabado-b1"];
          var array_hora = ["1","1","1","1","1","1","1","1","1","2","3","4","4","5","6","7","8","9","10","11","11","11","11","11","11"]
	 var date = new Date();
         var h = date.getUTCHours();
	var d = date.getUTCDay();
	console.log("dia"+array_bloque[d])
	console.log("diaUTC "+d)
	var bloque_d = array_bloque[d]+array_hora[h]
        var m = date.getUTCMinutes();
	if(h<10)h=0+""+h
        if(m<10)m=0+""+m        
	 h = h+""+m;
        
	h=parseInt(h);
	console.log(bloque_d)
	console.log(h)
     var a =  Ayudantes.find( {"bloques.hora":{ $lt : h },"bloques.bloque":bloque_d},'nombre mail matricula',function(err, ayudante) {
                if (err) res.send(err);
                if (ayudante!=null){
                                var json1 = JSON.stringify(
                                      ayudante
                                );
                                //console.log(ayudante);
                                res.send(json1);
                }
		else{
		               var json1 = JSON.stringify(
                                     { data: "receso"}
                                );
                                //console.log(ayudante);
                                res.send(json1);
		}

      });

});

// Registrar Bloque para Ayudante
// method post
app.post('/registro_bloques', function(req, res, next) {  
//	console.log("Solicitud de creacion de ayudante.");
//	console.log(req.body.rutAyudante);
//	console.log(req.body.bloque);
	    if (!req.isAuthenticated()){
           var json = JSON.stringify({data:"Usuario no autenticado- accion prohibida"});
           res.send(json);

    }
else{
	  var array_hora = ["930", "940", "1050", "1200", "1310", "1420", "1530", "1640", "1750", "1900", "2010"];
	  var bloque = req.body.bloque;
	  var n = bloque.slice(bloque.indexOf("b")+1,bloque.length)-1;
	//console.log(array_hora[n])
	Ayudantes.findOneAndUpdate(
    {"rut":req.body.rutAyudante},
    {$push: {"bloques": {bloque: req.body.bloque, hora: array_hora[n]}}},
    {safe: true, upsert: false},
		function(err, model) {
			//console.log(model);
			res.send(err);
		}
	);
   }
});

// Borrar Ayudantes de Bloque
// method post
app.post('/borrar_ayudantes', function(req, res, next) {  
	//console.log("Solicitud de borrado de ayudantes de bloque.");
	//console.log(req.body.bloque);
    if (!req.isAuthenticated()){
           var json = JSON.stringify({data:"Usuario no autenticado- accion prohibida"});
           res.send(json);

    }
    else{
	  var array_hora = [930, 940, 1050, 1200, 1310, 1420, 1530, 1640, 1750, 1900, 2010];
          var bloque = req.body.bloque;
          var n = bloque.slice(bloque.indexOf("b")+1,bloque.length)-1;
	//console.log(array_hora[n])
	Ayudantes.update(
      { "bloques" :{"hora":array_hora[n],"bloque":req.body.bloque}},
	  { "$pull" : { "hora":array_hora[n],"bloques" :{"bloque":req.body.bloque}}},
	  { multi:true}	,
		function(err, model) {
			console.log(model);
			var json = JSON.stringify({data:"bloque limpiado"});
			res.send(json);
		}
	);
	}
});

app.get('/logout', function(req, res, next) {
    req.logout();
    req.session.save(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/pages/login.html');
    });
});

app.get('/ping', function(req, res){
    
    if (!req.isAuthenticated()){
             res.redirect('/pages/login.html');
    }
    else{
    	res.status(200).send(req.user);
    }

});


app.use('/rfid.png', express.static(__dirname + '/rfid.png')); 

//app.all('*', function(req, res,next){
//	    if (!req.isAuthenticated()){
//		res.status(200).send("not");
//	    }
//	   else{
//		res.status(200).send("yes");	
//	    }
//	}
//);

app.listen(80); // Setup your server port.
