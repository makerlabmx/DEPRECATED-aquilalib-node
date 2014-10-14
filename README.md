# Aquila API

Biblioteca estilo jQuery para el manejo de los dispositivos en la red Aquila.
Se basa en un selector `Aq()` que funciona de forma similar a jQuery, pero en vez de seleccionar elementos en el DOM, selecciona dispositivos descubiertos en la cercanía del Hub, utilizando su dirección, nombre o clase.

Esta api se puede usar ya sea directamente en el servidor o en el navegador del cliente. Las funciones mostradas a continuación funcionan de la misma forma en ambas plataformas, excepto cuando se mencione lo contrario.

## Instalación y uso del Monitor

El Monitor es una herramienta para monitorear, controlar y hacer pruebas sobre la red Aquila desde la línea de comandos.

1. Instala los prerequisitos según tu sistema operativo: http://community.aquila.io/t/instalacion-de-software-hub-aquila-prerequisitos-para-windows-mac-osx-y-linux/43/1
2. Clona este repositorio

		git clone https://github.com/makerlabmx/aquilalib-node.git
		
3. Entra en la carpeta clonada e instala las dependencias

		cd aquilalib-node
		npm install
		
4. Conecta el Altair programado como "bridge" e inicia el monitor:

		node monitor.js
		
5. Puedes usar los comandos mencionados a continuación en la sección "Funciones de la API"

## Uso en el servidor:

Añade las siguientes dependencias:
```
var Aq = require("aquilalib").Aq;
var addressParser = require("aquilalib").addressParser;
var Entry = require("aquilalib").Entry;
```

## Uso en el navegador:

Añade las siguientes líneas en tu HTML:
```
<script src="/socket.io/socket.io.js"></script>
<script src="js/aquilaClient.standalone.js"></script>
```

## Funciones de la API:

### Aq(query)
Selector de dispositivos, query puede ser la clase de los dispositivos requeridos, el nombre, la dirección, un array de direcciones o "*" para obtener todos. Ejemplos:
```
Aq("*");						// Devuelve todos los dispositivos
Aq("mx.makerlab.apagador");		// Devuelve todos los dispositivos con esta clase
Aq("Apagador 1");				// Devuelve el dispositivo con nombre "Apagador 1" 
Aq("02:3B:45:00:00:20:98:23");	// Devuelve el dispositivo con esta dirección
Aq(["02:3B:45:00:00:20:98:23", "02:3B:45:00:00:20:98:32"]);		// Devuelve los dispositivos con esas direcciones.
```

- Funciones de Aq:
	- Aq.getPAN(callback): Devuelve la PAN actual como parámetro para la función callback.
	- Aq.setPAN(pan, callback): Configura la PAN, devuelve la PAN como parámetro para la función callback.
	- Aq.update(callback): Manda un mensaje broadcast de descubrimiento de dispositivos, llama callback al terminar.
	- Aq.reload(callback): Elimina todos los dispositivos descubiertos y vuelve a realizar el descubrimiento. Al terminar llama a callback.

- Aq.manager: manejador de dispositivos. Éste hace el trabajo duro de descubrir y mantener los dispositivos. Define los siguientes eventos útiles para la API:
	- "ready": Al iniciar la ejecución del servidor, inicializa el puente USB y el protocolo, para luego emitir este evento. *No se deben hacer requests antes de haber recibido este evento.
	- "deviceAdded": emitido cuando se descubre o vuelve activo un dispositivo. útil para actualizar la interfaz.
	- "deviceRemoved": emitido cuando un dispositivo pasa a estado inactivo (se apaga o sale de rango).

### AquilaDevices (Clase)
Tipo de objeto que devuelve la función Aq(), funciona como un array de dispositivos pero con el agregado de que se pueden llamar varias de las funciones de dispositivo sobre él, con lo que se realizará dicha función en todos los dispositivos seleccionados.

- Funciones de AquilaDevices:
	- AquilaDevices.setName(name): Cambia el nombre del dispositivo y lo guarda en la base de datos.
	- AquilaDevices.action(action, param): Ejecuta la acción "action" con el parámetro "param" (opcional) en todos los dispositivos seleccionados. action puede ser el nombre o número de la acción. param es un número de 0 a 255.
	- AquilaDevices.clearEntries(callback): Limpia todas las entradas de configuración en los dispositivos seleccionados, al terminar llama a callback con parámetro err (si hubo error).
	- AquilaDevices.addEntry(entry, callback): añade la entrada "entry", al terminar llama a callback con parámetro err. entry es un objeto de tipo Entry.
	- AquilaDevices.removeEntry(entryN, callback): Elimina la entrada número "entryN".
	- AquilaDevices.editEntry(entryN, entry, callback): Sobreescribe la entrada número "entryN" con un "entry" de tipo Entry.

	Ejemplo de uso:
	```
	Aq("Apagador 1").action("Off");
	Aq("Dimmer").action(1, 123);
	```

### Entry (Clase)
Usada para configurar y leer entradas de dispositivos. contiene lo siguiente:
- n: número de entrada. (sólo válido para entradas existentes en el dispositivo, cuando se añade uno nuevo se ignora).
- hasParam: si la entrada tiene parámetro. (bool)
- event: número de evento esperado.
- address: string de dirección del dispositivo de origen del evento esperado.
- action: número de acción a realizar para este evento.
- param: parámetro a utilizar para este evento.

Ejemplo de uso:

```
var newEntry = new Entry();
newEntry.event = 1;
newEntry.address = "02:3B:45:00:00:20:98:23";
newEntry.action = 2;

Aq("Apagador 1").addEntry(newEntry);
```

### Device (Clase)
Usada para representar los dispositivos individuales dentro de AquilaDevices. Implementa todas las funciones vistas en AquilaDevices, mas la posibilidad de inscribirse a eventos que emita el dispositivo.

- Miembros:
	- active: (bool) si está presente
	- address: string de dirección
	- class: string de clase
	- name: string de nombre
	- nActions: número de acciones que tiene el dispositivo (uso interno)
	- nEvents: número de eventos (uso interno)
	- nEntries: número de entradas configuradas en el dispositivo (uso interno)
	- maxEntries: número máximo de entradas soportadas en el dispositivo
	- actions: array con acciones, cada una es un objeto con n: número de acción y name: nombre.
	- events: array con eventos, cada uno es un objeto con n: número de evento y name: nombre.
	- entries: array con las entradas configuradas en el dispositivo (tipo Entry).
- Funciones: además de las mismas que AquilaDevices, cuenta con:
	- Device.ping(callback): hace un ping al dispositivo y llama a callback con err.
	- Otras de uso interno.

- Eventos: cuando el dispositivo emite un evento. se puede suscribir una función con `Device.on(<nombre del evento>, <mi función>);`, el evento puede incluir un parámetro, que se recibe como el primer parámetro de la función, o es null si no hay.

Ejemplo:

```
Aq("Dimmer")[0].on("Apagado", function(param)
{
	console.log("Se apagó el Dimmer");
});
```

### addressParser
Utilerías para manejo de direcciones.
- addressParser.isAddress(address): checa si es una dirección válida. address puede ser string o Buffer.
- addressParser.toBuffer(string): convierte un string de dirección a Buffer.
- addressParser.toString(buffer): convierte un Buffer de dirección a string.
- addressParser.compare(a, b): compara las direcciones a y b, si son iguales retorna true. a y b pueden ser string o Buffer.

*Formato de direcciones:

Las direcciones en el protocolo aquila son de 64 bits (8 bytes), excepto Broadcast, que es de 16 bits (2 bytes).
Se representan ya sea con buffers, cada byte un número hexadecimal, o con una representación en string, cada byte separado por ":" y en hexadecimal.

Ejemplos:
```
var address = new Buffer([0x23, 0x4D, 0x35, 0x00, 0x00, 0x02, 0x6F, 0x01]);
var broadcast = new Buffer([0xFF, 0xFF]);

var stringAddr = "23:4D:35:0:0:2:6F:01";
var stringAddr2 = "23:4D:35:::2:6F:1"	// los ceros se pueden obviar.
var stringBC = "FF:FF";

addressParser.compare(stringAddr, stringAddr2);	// retorna true
```
