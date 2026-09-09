# El sonido de la máquina · lo que está construido

> Este documento cuenta lo que **existe y suena**, no lo que se planeó. El plan
> vive en `plans/2026-09-07-sonido.md` y sigue siendo la referencia de por qué
> las cosas son como son; acá está lo que se hizo, lo que se descubrió haciendo
> y lo que todavía no.
>
> Las tablas de esta página están **atadas al código por `tests/docs/sonido.test.ts`**.
> Si alguien cambia un nivel y no lo cambia acá, la suite lo dice.

## ⚠ Seis cosas que se aprendieron fallando

Van primero porque las cuatro costaron una vuelta entera y ninguna se ve leyendo
el código.

### 1 · Hay DOS caminos, y confundirlos arruina el teclado

El plan pedía modelar el altavoz —de 200 Hz a 6 kHz, saturando— sobre **el bus
entero**, y argumentaba bien: hecho una vez, todo sale de época. Pero el mismo
plan avisa de que confundir **lo que la máquina EMITE** con **lo que la máquina y
la sala HACEN** es el error de diseño más caro de este trabajo. Y meter el
teclado por la bocinita es exactamente esa confusión.

Un teclado mecánico no sale por ningún altavoz: es un objeto en una habitación.
Lo que lo hace sonar rico es el cuerpo entre 100 y 400 Hz, y eso es lo PRIMERO
que se lleva por delante un recorte que empieza en 200. Se pierde en una línea y
no se recupera subiendo el volumen.

| Camino | Qué lleva | Cómo suena |
| --- | --- | --- |
| `speaker` | Lo que la máquina emite: la bocinita, los confirms, el glitch | Cono de 5 cm, 200 Hz–6 kHz, saturando. Acá lo pobre es la intención |
| `air` | Lo que la máquina y la sala hacen: la tecla, el relé, el cajón | Sin recorte de graves, techo a 9 kHz. Lo oye tu oreja, no un altavoz |

Comparten **una sola sala** y **un solo limitador**. Con un cuarto por camino, el
bip y la tecla sonarían en dos habitaciones distintas y el oído lo nota: se
rompe la ilusión de que hay una única máquina.

### 2 · La saturación era un control de volumen escondido

La curva estaba normalizada para que ±1 cayera en ±1, o sea `tanh(k·x)/tanh(k)`.
Eso multiplica las señales pequeñas por `k/tanh(k)`, y los dos caminos usan `k`
distinta: **seis decibelios de desequilibrio que nadie escribió**, encima de los
que el presupuesto reparte a propósito.

Un saturador **deforma; no sube ni baja**. Ahora es `tanh(k·x)/k`: pendiente
unidad en el origen y compresión sólo en los picos.

### 3 · Un pasabanda estrecho tira casi toda la energía

El error de modelo más caro. El número que se le pasa a la envolvente **no es el
nivel de salida**: es un multiplicador sobre lo que el filtro deja pasar. Y las
voces físicas son ruido de banda ancha metido por pasabandas estrechos —así es
como una tecla suena a plástico y a placa en vez de a siseo—. El cuerpo de la
tecla está a 310 Hz con Q 6,5: deja pasar unos 48 Hz de los 24 000 disponibles,
o sea **tira el 99,8%**. La bocinita no cruza ningún filtro y salía entera.

Medido en el navegador antes de arreglarlo: la tecla a **−47,5 dBFS** de RMS y el
error a **−19,4**. Veintiocho decibelios, cuando el presupuesto pide seis.

No se arregla con un número a ojo, porque depende del filtro: `bandpassMakeup`
devuelve la raíz de la fracción de espectro que el filtro conserva, con tope de
40 —sin tope, un Q alto en graves pide multiplicar por cientos y lo que sale
amplificado es ruido de cuantización, no un sonido—.

### 4 · La repetición se cuela por el sitio más tonto

El búfer de ruido se genera **una vez** y se reutiliza: uno nuevo por pulsación
sería rellenar decenas de miles de números en el hilo principal mientras alguien
escribe. Pero si todos los disparos arrancan en la muestra cero, todos comparten
la misma forma de onda inicial — el filtro cambia, el volumen cambia, y **se oye
igual**, porque el ataque es idéntico y el ataque es lo primero que llega.

Arrancar pasa por una función que no deja olvidarse del desplazamiento.

### 5 · Una voz de dos tiempos sobrevive a su propio apagado

Varias voces tienen un segundo golpe aplazado: el encendido y su cabezal 620 ms
después, el barrido y su impacto. Ese segundo tiempo vivía en un `setTimeout`
suelto que nadie cancelaba, así que **apagar el sonido dejaba el golpe en el
aire** y sonaba después de haberlo apagado.

Se cazó en los tests, y ahí se vio lo que era: un golpe aparecía en una medición
a la que no pertenecía. Es el mismo fallo que en la app se oye como un ruido sin
causa. Ahora todo lo que se aplaza se apunta, y el desenchufe se lo lleva por
delante — porque `parar()` **promete** desenchufar el sonido, y una promesa a
medias es peor que no prometer nada.

### 6 · Un contexto dormido no tira el sonido: lo GUARDA

Todo `AudioContext` nace suspendido hasta que hay un gesto del usuario. Lo que no
se ve leyendo es que un contexto suspendido **no descarta** lo que se le programa:
congela su reloj y lo acumula. Se midió en el navegador con un tono a 0,2 de
amplitud programado con el contexto dormido — al despertarlo **ocho segundos
después sonó entero, a su amplitud completa**.

O sea que todo lo que la máquina intenta decir antes del primer gesto se amontona
y estalla junto en el instante en que alguien toca una tecla. Es exactamente el
«pitido feo al empezar» que se reportó jugando.

La regla que sale de ahí: **un golpe que no se puede oír ahora no es un golpe que
haya que oír después**. `play` no programa nada con el contexto parado. El
ambiente es la excepción y no pasa por ahí a propósito: es continuo, no un
instante, así que oírlo aparecer tarde es lo correcto — sigue ahí cuando llega el
permiso.

## Los caminos, en orden

```
                 ┌── speaker ──▶ corte 200 Hz ──▶ corte 6 kHz ──▶ satura fuerte ──┐
lo que emite ────┘                                                                │
                                                                                  ├──▶ limitador ──▶ maestro ──▶ salida
                 ┌── air ──────▶ techo 9 kHz ──▶ satura suave ─────────────────────┘
lo que hace  ────┘                                                          ▲
                                                                            │
              room ──▶ convolver (IR generada por código) ──────────────────┘
```

La banda va **antes** de la saturación: saturar primero generaría armónicos
agudos que el cono no puede dar y que habría que recortar después, o sea suciedad
que no aporta. Y la sala **devuelve por el aire**: el cuarto no se oye a través
del altavoz de la máquina, se oye con la oreja.

## Las voces

| Voz | Familia | Camino | Qué es |
| --- | --- | --- | --- |
| `key` | `keys` | aire | La tecla. Tres capas: chasquido, cuerpo y fondo |
| `tick` | `keys` | aire | El tic del teletipo, por línea y nunca por carácter |
| `relay` | `glitch` | aire | El relé. DOS chasquidos: la armadura rebota |
| `drawer` | `confirm` | aire | La entrega de una pieza. Un cajón que se abre |
| `beep` | `confirm` | bocinita | La onda cuadrada cruda. La única que suena barata a propósito |
| `confirm` | `confirm` | bocinita | Dos notas. Una familia, no treinta y tres melodías |
| `glitchBurst` | `glitch` | bocinita | El fallo, cortado en escalones |
| `tear` | `glitch` | aire | Algo pegado que cede a tirones. Madera y yeso, no electrónica |
| `chatter` | `ambience` | bocinita | Ráfagas de datos a alturas que no forman escala |
| `button` | `keys` | aire | El pulsador de la interfaz. NO es la misma voz que una tecla |
| `head` | `keys` | aire | La búsqueda de cabezal: varios golpes, y no a compás |
| `capacitor` | `glitch` | aire | La corriente entrando. Un golpe, sin tono |
| `sweep` | `failure` | bocinita | La señal cayéndose. DOS osciladores desafinados |
| `whine` | `ambience` | aire | El chillido del flyback, a 15,7 kHz. La firma de un tubo |
| `powerUp` | `glitch` | aire | Encender: la corriente entra y el chillido sube |
| `powerDown` | `glitch` | aire | Apagar: el chillido cae, golpe, y el tubo se descarga |
| `thud` | `failure` | aire | El impacto lejano: algo cayó, y cayó detrás |

⚠ **La tecla son TRES capas y hay un test que lo fija.** Un oscilador solo suena
a juguete; tres capas suenan a objeto. El día que alguien la «simplifique» a una
fuente, la suite lo dice — porque de oído se nota que algo empeoró y no se sabe
qué.

⚠ **El glitch se corta en escalones**, con un número impar y variable de tramos.
Con un número fijo, dos glitches seguidos tienen el mismo ritmo interno y se oye
el bucle. Y sube de volumen con la misma variable que mueve la imagen.

## La mezcla

El presupuesto, relativo al maestro. **El orden es la jerarquía de atención**, no
una lista: el ambiente es lo más bajo porque suena siempre, y el fallo total lo
más alto porque pasa una vez. Subir las teclas «para oírlas mejor» hasta alcanzar
los confirms deja una máquina que grita al escribir y susurra cuando algo se
rompe.

| Familia | Pico |
| --- | --- |
| `ambience` | −50 dBFS |
| `keys` | −18 dBFS |
| `confirm` | −14 dBFS |
| `glitch` | −10 dBFS |
| `failure` | −6 dBFS |

⚠ **Y el presupuesto es RELATIVO: no fija el nivel absoluto.** Eso lo hace el
maestro, `MASTER_DB`, un solo número al final de la cadena. Era un agujero del
diseño y se reportó jugando —«el volumen está muy bajo, me toca subirle mucho el
sonido al compu»— y los dos síntomas eran el mismo fallo: subir el equipo para
oír la tecla convierte el zumbido del ambiente en un tono de prueba.

Sube **todo por igual** a propósito. Subir las teclas «para oírlas mejor» habría
desarmado la jerarquía de atención; un maestro no puede desordenar nada.

Y una compuerta: **nunca dos sonidos de la misma familia dentro de 60 ms**. Sin
eso, escribir rápido dispara una ametralladora.

Dos decisiones de la compuerta que costaría caro descubrir a oído:

- **Cada familia tiene SU puerta**, no hay una global. El glitch y la tecla
  ocurren a la vez constantemente —escribís y la máquina falla encima— y con una
  sola puerta uno se comería al otro según cuál llegara primero.
- **Un disparo rechazado NO corre la ventana.** Si cada rechazo empujara el reloj
  otros 60 ms, mientras no pararas de escribir no volvería a sonar nada: la tecla
  sonaría sólo al dejar de teclear, siempre tarde y despegada del gesto.

## El ambiente

Un zumbido de chasis con tres armónicos y aire, a −50 dBFS: **treinta y dos**
decibelios por debajo de las teclas.

⚠ **Y el aire va por un PASABAJOS, no por un pasabanda.** Estuvo puesto como
pasabanda con Q 0,7 —un ancho enorme, que deja pasar agudos de sobra— y encima
con la compensación de un filtro estrecho. Eso no es un chasis: es siseo de banda
ancha, y se reportó jugando tal cual, «suena a estática». Un chasis es GRAVE.

⚠ **Y no es exageración: es lo que compensa ser continuo.** El presupuesto mide
picos, y ahí lo continuo hace trampa sin querer — el pico de un zumbido ES su
nivel medio, porque no para nunca, mientras que una tecla es un transitorio de
ocho milisegundos cuyo nivel medio está muy por debajo de su pico. A igual pico,
lo continuo se oye muchísimo más fuerte.

⚠ **Y sus cuatro fuentes se NORMALIZAN antes de aplicar ese número.** Sumaban
2,13 entre ellas, así que el zumbido salía al doble de lo que la tabla decía:
−37 dBFS reales con el presupuesto en −44. Es el fallo clásico de mezclar —cada
voz suena bien sola y lo que llega a la salida es la suma— y hasta arreglarlo,
bajar el número de la tabla sólo curaba la mitad.

⚠ **No es un lecho.** Un zumbido de red más un ventilador más siseo, sonando sin
parar, agota en cinco minutos y arruina lo demás por enmascaramiento: cuanto más
fondo hay, menos sitio queda para lo que sí importa oír.

⚠ **Y existe sobre todo para poder DESAPARECER.** Quitar de golpe algo que
llevaba veinte minutos ahí es lo más fuerte que puede hacer este sistema y no
cuesta ni un fichero. Sin nada de fondo, el silencio del derrumbe no cuesta nada
y no vale nada. Ésa es la única razón por la que se queda.

**Respira.** Tres armónicos, cada uno con un LFO lentísimo empujándole el tono, a
ritmos que no son múltiplos entre ellos. Un bucle fijo se delata en treinta
segundos: el oído aprende el patrón y a partir de ahí oye un fichero
repitiéndose.

⚠ **Está desde el principio, sin que nadie lo active.** Estuvo arrancando con la
primera actividad, razonando que un ambiente que aparece antes de que hagas nada
se oye ENTRAR. Eso es cierto de un ambiente que sube de golpe, y llevaba a la
conclusión equivocada: el fondo no es una reacción a lo que hacés, es el ruido de
que la máquina está encendida — y una máquina encendida no espera a que la
toquen. Lo que evita que se oiga entrar no es retrasarlo: es que suba despacio.

Sube en 4 segundos y se apaga tras **40 000 ms** sin actividad: bastante más de lo que dura una pausa
escribiendo, bastante menos de lo que dura irse a leer otra cosa.

Y sabe callarse de dos maneras distintas, que no son la misma:

| | Qué hace | Para qué |
| --- | --- | --- |
| `duck` | Lo baja y lo devuelve | Cuando habla el ente: la sala se calla para escucharlo |
| `silence` | Lo pone en **cero exacto** | El derrumbe. Un ambiente a −60 dB sigue estando ahí |

## El arranque, y el tono de las barras

⚠ **Las barras de ajuste van con un tono de 1 kHz, y no es una licencia.** Las
cartas de ajuste de televisión lo llevaban SIEMPRE: era la señal con la que se
calibraba el nivel de audio de una emisión, y por eso cualquiera la asocia con
«esto es una carta de ajuste» sin saber por qué. Es lo que convierte unos
rectángulos de colores en algo que se reconoce.

Se engancha a que las barras **aparezcan en pantalla**, no a un temporizador: si
el arranque cambia de ritmo, el tono lo sigue solo. Un temporizador paralelo se
desincroniza el día que alguien ajuste una duración, y nadie lo nota hasta que el
tono se queda sonando encima del logo.

## De dónde sale cada sonido

⚠ **Un solo suscriptor, no cuarenta llamadas.** `SoundWire` es el único
componente de toda la app que sabe que existe el sonido. Si se repartiera,
quedarían disparos huérfanos en sitios que nadie recuerda — y no es una
hipótesis: `awardFrom` ya se llama desde nueve sitios distintos.

| Fuente | Cómo se escucha | ¿Toca código de la app? |
| --- | --- | --- |
| Teclas | `keydown` en el documento, en captura | no |
| Glitch | el almacén de `useGlitch` | no |
| Golpes a la pared | `MutationObserver` sobre el `body` | no |
| Hallazgos | el almacén del sistema, comparando conjuntos | no |
| Avería de señal | el mismo almacén | no |
| Botones y cualquier cosa con cursor de mano | `click` en el documento, en captura | no |
| El tubo encendiéndose, apagándose y la carga | la tabla `screens.ts`, por marcas que la app ya pinta | no |
| Barrido y colapso | los atributos que la app ya pone en el documento | no |
| El tema cambiando | el mismo atributo `data-theme` | no |

⚠ **Borrar suena mientras borra, y calla al terminar.** Mantener el retroceso
apretado hace que el navegador dispare una y otra vez, y cada repetición borra un
carácter de verdad: suena. La que ya no borra nada —el cursor al principio, el
campo vacío— no. El modelo no es el interruptor del teclado, es **lo que la
máquina hace**.

La tecla suena **sólo si el foco está escribiendo de verdad**: con cualquier
tecla, navegar con el tabulador haría ruido de teclado sin que nadie escriba. Y
los modificadores solos no golpean nada, o escribir en mayúsculas sonaría al
doble de velocidad.

## La máquina encendiéndose y apagándose

Un atributo del documento dice en qué **pantalla** estás; una clase del árbol dice
qué está pasando **en** ella. Los dos sirven, y confundirlos fue el fallo.

⚠ **La asociación es un dato, no código.** Vive en `screens.ts` y el suscriptor
sólo la recorre. Antes cada momento estaba cableado a mano —cinco bloques casi
iguales— y cada pantalla nueva obligaba a acordarse de ir a tocarlos: el mismo
camino por el que `awardFrom` acabó llamado desde nueve sitios.

Ahora **la pantalla no pide sonar**: pinta la marca que ya pintaba y el sonido la
reconoce. Una pantalla nueva que pinte `.collapse-dying` suena a tubo apagándose
sin tocar una línea de sonido, porque lo que se comparte no es una llamada, es la
marca.

| Marca | Qué suena |
| --- | --- |
| `.collapse-dying` | El tubo al que le cortan la corriente |
| `.tube-on` | La corriente volviendo: el tubo abriéndose de un punto a la imagen |
| `.boot-bars` | La carta de ajuste, sola con su tono |
| `.collapse-bars` | La carta de ajuste de un tubo que seguía encendido |
| `.boot-logo` | Un disco leyendo para arrancar, bajo el rótulo del fabricante |
| `.collapse-reboot` | La máquina leyendo para volver, y sigue leyendo mientras carga |
| `.boot-check` | El bip de POST: memoria contada, todo bien |
| `.loose-slab--cae` | El pedazo de pared cayendo, y lo que llega al suelo detrás |
| `.wall-rain` | El ojo mirando por el agujero: la sala se da vuelta y los datos chacharean |
| `.is-entity` | Cuando contesta ÉL, la sala baja para escucharlo |
| `.phantom-error` | Una ventana de error apareciendo de golpe |
| `.lockout-body` | El bloqueo: la máquina que ya no te deja entrar |
| `.dead-page` | La página muerta: te sacó y ya |

### ⚠ El pong tiene TRES tonos, y son los de verdad

El pong original tenía exactamente tres sonidos —paleta, pared y punto— y los tres
eran **la misma onda cuadrada a distinta altura**, porque el circuito no daba para
más. Eso es lo que hace que dos blips se reconozcan como un juego y no como una
interfaz, así que se respeta: 300 Hz la paleta, 620 la pared, 170 el punto.

El más grave es el tuyo. La pared es más aguda y más corta porque no la hiciste
vos. Y el punto es el único de los tres que dura.

⚠ **El juego publica lo que pasa y el sonido lo lee.** Los rebotes ocurren dentro
del paso de física, entre fotograma y fotograma, y el suscriptor no puede verlos
desde afuera. Antes que meter un `play()` en el componente —el primer disparo
huérfano fuera del suscriptor— el juego escribe **contadores** en su raíz. Es el
mismo trato que usa la pared floja con `--blow-amp`.

Contadores y no banderas: una bandera de «rebotó» habría que apagarla, y dos
rebotes en el mismo fotograma dejarían uno mudo. Un número que sube no pierde
ninguno.

⚠ **Y la tabla de glifos cayéndose no es un cuarto tono.** Cuando el juego pasa a
dibujarse con caracteres, eso no es un sonido de juego: es la señal rompiéndose,
el mismo tirón que en el resto de la app. Pequeño y sólo al llegar — pasa cada
tanto y solo, y un tirón grande convertiría una avería de fondo en el
protagonista, que acá es la pelota. Volver a la normalidad no suena, porque
volver no es un suceso: es dejar de pasar algo.

⚠ **El tic del teletipo va por LÍNEA, nunca por carácter.** Las respuestas se
teclean letra a letra —dieciocho milisegundos cada una— y un tic por carácter
sería una ametralladora aunque la compuerta lo recortara. Un teletipo golpea el
papel una vez por renglón, y ése es el ritmo que hace que una respuesta se sienta
**impresa** en lugar de aparecida.

Y no toca el marcado de la respuesta, que era la tentación: envolver cada línea en
su propio elemento habría cambiado cómo se parten las largas —la respuesta usa
`pre-wrap` y las filas de `//help` usan `pre`— y un sonido no puede permitirse
mover la maquetación. Se observa el texto donde ya está, con un observador acotado
a la respuesta. Cuenta las dos formas de imprimir un renglón que tiene esta app:
un salto de línea en el texto tecleado y una fila entera de las que `//help`
revela de golpe.

⚠ **Y apagar y encender ARREGLA lo que arregla un reinicio.** El botón y
`//reboot` hacían el ciclo entero y devolvían la máquina igual de rota; una
máquina que se reinicia y sigue rota no se reinició. Ahora se lleva las averías de
sesión —la señal cromática, el desgaste del rótulo, las rachas— que es exactamente
lo que una recarga se lleva. No toca nada ganado: eso es `//reset`, que avisa
antes. Y el bloqueo sobrevive con su avería, porque ahí reiniciar no puede ser la
salida fácil.

### ⚠ Y una máquina que todavía no arrancó no tiene ruido de sala

El zumbido de fondo son tres senos a **58, 116 y 175 Hz** y su entrada dura cuatro
segundos. Como el navegador no deja sonar hasta el primer gesto, esos cuatro
segundos empezaban **exactamente** al pulsar la tecla — o sea que el grave subía
justo encima de las barras y se comía el tono de 1 kHz. Se reportó tal cual: «hay
dos sonidos, el grave tapa el otro, que es el verdadero de las barras de colores».

No se arregla bajándole el volumen, y tampoco callándolo durante todo el arranque:
eso se probó y era demasiado, porque lo que se pidió fue justo lo contrario — «ese
grave me gusta, que suene al entrar». Lo que hay que evitar no es que el zumbido
exista mientras la máquina arranca, es que **su subida** caiga encima de la carta
de ajuste.

De eso se encarga el compás oscuro de la puerta: el zumbido entra ahí, con la
pantalla todavía negra, y para cuando llegan las barras ya es un suelo quieto en
vez de algo que sube. Callan la sala sólo las dos cosas donde de verdad no hay
corriente: el tubo al que se la cortan y el sistema derrumbado.

### ⚠ Dos sonidos que se pisan casi nunca se arreglan separándolos

Se reportó jugando: «se solapan dos sonidos, uno de las barras y otro como de
inicio». El encendido y el tono de 1 kHz caían en el mismo milisegundo.

El primer intento fue **separarlos en el tiempo**: dejar el encendido en las
barras y hacer entrar el tono 300 ms después. Y no era eso — se volvió a reportar.
El sitio estaba mal, y quien juega señaló cuál era el bueno, con la línea exacta:

> «va después de la parte de carga de MEMORIA CONVENCIONAL… INICIANDO FLASH-NOTES…»

Y encaja con lo que ese sonido **es**. No es el filamento calentando: es el
chasquido del interruptor, el golpe de corriente y el flyback quedándose arriba —
el aparato entero entrando en marcha. Eso no pasa cuando aparece la primera imagen
de prueba, pasa cuando el sistema arranca de verdad, que es la última línea de esa
lista.

La comprobación es la última pantalla del guion, así que **quitarse** es el
instante en que la app aparece. Por eso el encendido cuelga de que esa marca SE
VAYA y no de ninguna pantalla nueva: hay momentos que no son la aparición de nada,
son el final de algo.

Las barras se quedan con su tono y nada más, que es exactamente lo que emitía una
carta de ajuste. Y el cabezal se mudó al **rótulo**, que es donde este documento
decía que estaba y el código no —iba colgado 620 ms después del encendido, o sea
encima de las barras—. El arranque queda en cuatro momentos que no se pisan:
**señal, lectura, comprobación y marcha**.

⚠ Y por eso el colapso dejó de encender al irse. La razón de entonces era que se
rearranca solo, sin pasar por la pantalla de arranque, y era **falsa**: su cuenta
atrás termina pidiendo el arranque desde las barras. Con el encendido al final de
la comprobación, dejarlo también ahí lo hacía sonar dos veces por colapso.

⚠ **Se escogieron marcas que YA existían**, no clases inventadas para esto.
`.collapse-dying` la pintan las cuatro pantallas que apagan un tubo —la puerta, el
arranque, el colapso y el barrido— porque las cuatro cierran la imagen a un punto.
Que ya estuviera compartida es la prueba de que el momento es el mismo; inventar
una clase nueva habría sido decidir por mi cuenta que no lo era.

⚠ Y por eso mismo la puerta **dejó de usar `.boot-logo`**: apilaba igual, pero no
enseña ningún rótulo del fabricante, y desde que esa marca significa «hay un disco
leyendo» quedarse con ella la habría hecho sonar a algo que no estaba pasando. Se
comparte el estilo, que es lo único que tenían en común.

Y aparte, dos atributos que sí son un suceso entero por sí mismos:

| Atributo | Qué suena |
| --- | --- |
| `data-wiping`, `data-collapsing` | El barrido largo, y un impacto lejano detrás |
| `data-theme` | Un relé por cada cambio. Es lo que hace el parpadeo del tema roto |

⚠ **Sólo cuenta la aparición.** Un observador ingenuo dispara con cualquier
cambio, y entonces el arranque sonaría dos veces: al empezar y al acabar.

### ⚠ El apagado no sonaba, y era un error de modelo

Se reportó así: «el de apagar cuando reiniciamos no sale». Estaba colgado de dos
atributos, y los dos eran la cosa equivocada.

`data-booting` **no** quiere decir «el tubo se encendió»: quiere decir «la
pantalla de arranque está puesta». Y esa pantalla **empieza con el equipo
apagándose** — la primera fase de su guion es el apagón. Colgar el encendido de
ahí lo disparaba antes del apagado, o sea al revés de como pasa; y como encender y
apagar son la misma familia, la compuerta de 60 ms se tragaba entero el apagado
que venía detrás.

`data-tube-off` era peor: sólo lo pone la pantalla de arranque cuando su guion
pasa por la fase de apagón, y **el reinicio del colapso arranca el guion desde las
barras**. Esa fase no existe ahí, así que el atributo no aparecía nunca.

Lo que suena no es la pantalla, son sus **fases**, y una fase se ve. `.collapse-dying`
ya la comparten las tres pantallas que apagan un tubo —el arranque, el colapso y el
barrido— porque las tres pintan el mismo cierre a un punto. Una marca que ya se
comparte no se puede quedar a medias como se quedaba el atributo.

### ⚠ Y el reinicio se quedaba mudo medio minuto

La otra mitad del mismo informe: «el sonido sólo lo escuché una vez, luego ya no
sale». La barra de reinicio del colapso dura **entre diez y cuarenta segundos**, y
más cuanto más hayas insistido. Sonaba una vez al aparecer y después nada — el
tramo de silencio más largo del producto, y el más tenso.

Y había una segunda mitad peor: el zumbido de fondo se apaga tras 40 000 ms sin
actividad, así que en un reinicio largo la máquina se quedaba **muerta del todo
justo mientras trabajaba**. Un cabezal que vuelve a buscar cada 1 500 ms arregla
las dos cosas con el mismo gesto, porque cada golpe cuenta como actividad. Con
jitter: a compás sonaría a metrónomo, y un disco buscando nunca encuentra dos
veces a la misma distancia.

### ⚠ El rótulo de la cabecera es su propio caso

No suena como pulsador, y eso **no es un olvido**: es un secreto escondido, no se
anuncia, no lleva cursor de mano, y sonar al tocarlo sería señalarlo. Un clic
suelto tiene que poder pasar por accidente.

El segundo ya no es un accidente. Desde ahí la máquina contesta con un pitido
corto y agudo por la bocinita — no una alarma, la máquina notando que la están
tocando. Es lo que convierte la escalada en algo que se **oye** venir antes de
verse: el aviso, el parpadeo de versión al tercero, la avería del quinto al
octavo, el colapso al noveno.

El contador no se lleva acá: se lee del almacén, que ya lo tiene con su ventana de
olvido. Un segundo contador se desincronizaría el día que alguien ajustara esa
ventana, y nadie lo notaría hasta que el aviso sonara cuando no toca.

⚠ **Y un botón NO es una tecla.** Son dos objetos distintos: una tecla tiene
cuerpo de plástico y de placa, un botón es un chasquido más seco y más corto. Si
sonaran igual, apretar un botón se leería como haber escrito una letra. Sólo
cuentan los controles de verdad — un clic dentro del editor para poner el cursor
no es apretar nada, y si sonara, colocar el cursor haría el mismo ruido que
confirmar un borrado.

## Los confirms, y los que suenan mal

Dos notas, siempre las mismas. Treinta y tres jingles distintos son ruido y no
diseño: nadie recuerda treinta y tres, y el primero que suena no significa nada
porque no se parece a nada anterior.

⚠ **Cuatro de los cinco `entity-*` suenan MAL a propósito**: el mismo gesto
invertido y corrido un cuarto de tono. Porque esos hallazgos no los encontraste
vos, **te los dio él**. Invertirlo a secas daría un confirm descendente afinado,
que suena a «cancelado» — otra cosa; lo que tiene que sonar es roto.

`entity-reported` **suena limpio**, y es la decisión que da sentido al resto: es
el único que conseguiste volviéndote en su contra. Ése no te lo dio, se lo
quitaste — y que suene bien justo ahí lo convierte en una pequeña traición.

## El interruptor

Encendido por defecto, exactamente como los efectos: `flashnotes:sound`, y
apagado sólo si vale `off`. Se toca con `//sound on | off` o con el botón del
panel de diagnóstico, al lado del de efectos.

⚠ **`//sound` NO es un secreto.** No lleva `secretId`, y no es un olvido:
contarlo subiría la colección a treinta y cuatro, y `SECRETOS.md`, el panel y
media docena de tests dicen treinta y tres. Un ajuste no puede mover el marcador
del juego.

⚠ **Apagado no crea ni un nodo.** No es volumen cero: el `AudioContext` no llega
a existir. Un contexto abierto mantiene despierto el subsistema de audio del
sistema operativo, y en un portátil eso se paga en batería aunque no suene nada.

Y `prefers-reduced-motion` lo deja apagado: quien pide menos movimiento no está
pidiendo más ruido.

## Encender y apagar el tubo

⚠ **Un CRT no hace un barrido de sierra.** Eso fue lo primero que se puso y se
reportó como «poco natural», con razón: es el efecto de videojuego de toda la
vida. Un CRT tiene un transformador de líneas —el flyback— que chilla a unos
15,7 kHz mientras hay alta tensión, y ese chillido es la firma del aparato.

Apagar son tres cosas a la vez: el chillido **cae** —la alta tensión se pierde
poco a poco, cortarlo en seco suena a mute—, un golpe del chasis, y el tubo
descargándose con un crujido corto. Encender es lo mismo al revés y **en el orden
contrario**: primero entra la corriente, después aparece el chillido y sube hasta
su sitio. Si el chillido llegara primero, sonaría a que algo ya estaba encendido.

⚠ **Y el fondo NO pulsa.** Hubo un latido lento sincronizado con la línea del
CRT, que sobre el papel encajaba —lo que se ve también se oye— y escuchándolo
molestaba. Un fondo que pulsa reclama atención, y un fondo que reclama atención
deja de ser un fondo. Lo continuo tiene que ser plano.

## ⚠ «PULSE UNA TECLA», y por qué existe

Todo `AudioContext` nace suspendido y **ningún navegador lo deja arrancar hasta
que hay un gesto del usuario**. Es una política contra la publicidad con sonido y
no tiene vuelta: cualquier cosa programada antes queda muda. Por eso el arranque
entero —barras, rótulo, comprobación— transcurría en silencio, y no había forma
de arreglarlo desde el código del sonido.

La única salida honesta es que el producto **pida** el gesto. Y da la casualidad
de que las máquinas de esa época hacían exactamente eso, así que la limitación
entra en la ficción sin forzarla: lo que era un impedimento técnico pasa a ser el
primer gesto de encender la máquina.

Aparece **sólo antes del primer arranque** —los reinicios ya vienen después de un
gesto— y **sólo si hay sonido que desbloquear**: con el sonido apagado sería un
paso de más entre alguien y sus notas, que es lo que prohíbe la regla A2.

### El ciclo de una recarga

Recargar es apagar y encender, y ése es el orden de los hechos:

| | Qué se ve | Qué se oye |
| --- | --- | --- |
| 1 | El tubo se cierra a un punto | **nada — todavía no hay permiso** |
| 2 | `PULSE UNA TECLA` sobre la pantalla muerta | nada |
| 3 | El tubo se abre: punto, línea, imagen | el encendido, y el zumbido entrando |
| 4 | Barras | el tono de 1 kHz |
| 5 | Rótulo | un disco leyendo |
| 6 | Comprobación | el bip de POST |
| 7 | La app | — |

### ⚠ `//reboot`, que es el único sitio donde el arranque se oye entero

Una recarga del navegador **destruye el documento**, y el nuevo nace sin permiso
para sonar. Por eso su apagón llega mudo, y por eso no hay código que lo arregle.

Un reinicio pedido desde dentro no navega a ninguna parte: el audio sigue
desbloqueado desde que escribiste el comando, así que el ciclo entero —apagado,
encendido, barras, rótulo, comprobación— **suena como se ve**. Mismo dibujo,
distinta suerte.

No borra nada: es el vecino inofensivo de `//reset`. Y por eso puede filtrarse en
`//help` como los demás callejones sin salida — lo que enseña es el arranque, que
ya viste al llegar; lo que regala es oírlo.

⚠ De ahí salió también que el **encendido sea una fase del guion** y no sólo un
acto de la puerta. Vivía sólo ahí, así que un arranque pedido desde dentro pasaba
del apagón a las barras sin encenderse — sin la mitad que se oye.

⚠ **El paso 1 se ve pero no se oye, y no hay código que lo arregle.** Pasa antes
del primer gesto, y ningún navegador deja sonar antes de eso. Se reportó dos veces
—«la de apagar cuando se reinicia no suena, pero cuando se reinicia luego de darle
al cromo esa sí»— y las dos veces es la misma causa: la misma pantalla y la misma
fila de la tabla, pero una cae antes del permiso y la otra después.

Se probó moverlo detrás de la tecla para que sonara, y era **peor**: rompe el
orden de los hechos, que es lo único que esa pantalla tiene que contar. Un apagado
mudo sigue leyéndose como un apagado; un apagado que ocurre después de encender no
se lee como nada.

### ⚠ El paso 3, que es donde se resolvió lo demás

Es una animación nueva y es el **inverso exacto** del apagón: un punto que se abre
en línea y la línea en imagen, que es lo que hace un tubo al recibir tensión.

⚠ Hubo otro encendido antes y se quitó con razón: era una línea que nacía en el
centro y se abría, y se veía como una pantalla ajena abriéndose **encima**. La
diferencia está en de dónde sale la forma. `collapse-dying` no es «una línea»: es
la imagen entera aplastándose a una línea y la línea cerrándose a un punto.
Recorrer esos mismos tres estados al revés no inventa un idioma nuevo — es el
mismo leído hacia el otro lado. Y termina **desvaneciéndose**, así que revela lo
que hay detrás en vez de cubrirlo; tapar era el error de la versión vieja.

Ese tramo resuelve dos cosas que antes no tenían sitio:

- **El encendido tiene por fin imagen que lo acompañe.** Anduvo en las barras
  —donde se pisaba con el tono de la carta— y después al final de la comprobación,
  que sonaba bien pero no tenía nada que mirar mientras.
- **El zumbido cabe.** Se pidió oírlo —«ese grave me gusta, que suene al entrar»— y
  a la vez que no se solapara con las barras. Sin este hueco sólo podía entrar
  encima de ellas, porque el navegador no deja sonar hasta el primer gesto y a
  partir de ahí todo pasa a la vez. Y no es una licencia: un equipo que acaba de
  recibir corriente zumba antes de tener imagen.

Ahí el zumbido entra en **1 segundo** y no en cuatro (`WAKE_FADE_S`). Los cuatro
existen para que el fondo no se oiga entrar a mitad de una sesión; al encender es
al revés — el zumbido apareciendo **es** el suceso.

## La cadena del arranque, con la referencia de la industria

| Fase | Qué suena | De dónde sale |
| --- | --- | --- |
| Encendido | Golpe de corriente y el flyback subiendo | Un CRT al que le dan tensión |
| **Barras** | El tono de **1 kHz** | La carta de ajuste de televisión, calibrando nivel |
| **Rótulo** | La búsqueda de cabezal | Un disco leyendo para arrancar |
| **Comprobación** | **El bip de POST** | Un PC que pasa su autoprueba da UN pitido corto |

⚠ **El bip va en la comprobación y no antes.** No anuncia que empieza: CERTIFICA
que terminó bien. Al principio estaría diciendo que salió bien antes de mirarlo.

## Dónde escucharlo

`/banco` tiene dos secciones de sonido, y no dicen lo mismo.

**SONIDO** es el banco de pruebas: cada voz suelta, las capas de la tecla por
separado, la sala en un mando y un área para escribir rápido y comprobar la
compuerta.

**SONIDO · SUS SUCESOS** es el catálogo: qué dispara cada sonido. Arriba la mitad
que se VE —una marca del árbol que la app ya pinta— y abajo la que no: teclas,
almacenes y observadores de atributos. Cada fila se puede disparar, porque una
tabla que sólo se lee obliga a creérsela y una que suena se comprueba sola.

⚠ **TODAS, sin excepciones.** Se reportó jugando —«el banco tiene sonidos que no
se dejan reproducir»— y era cierto por dos motivos: las voces que piden datos
—hercios, amplitud— no tenían de dónde sacarlos, y tres filas no disparan un
golpe. Ahora los datos salen de `SAMPLE_ARGS`, que son los que usa la app de
verdad, y cada forma tiene su demostración: las dos cartas de ajuste encienden su
tono 1,4 s, y la sala agachándose enciende un zumbido si no había ninguno —enseñar
un hueco en el silencio sería enseñar nada—. El tipo de `SAMPLE_ARGS` está escrito
sobre las voces que llevan argumentos, así que una voz nueva sin muestra no
compila.

⚠ **Y el botón dice `[OÍR]`, no el nombre de la voz.** También se reportó —«se
repite el de power up»—: varias filas comparten voz —el apagado suena en el tubo
cortándose Y en la página muerta, el barrido en el pedazo Y en el bloqueo— y la
lista salía con etiquetas idénticas. Lo que distingue una fila de otra es el
SUCESO; la voz repetida no es un defecto, es economía, y ahora se ve en qué dos
sitios ocurre.

⚠ **Y no puede quedarse corta.** Hay un test que exige que toda voz declarada en
`CATEGORY_OF` aparezca en una de las dos tablas —o en `INTERNAL_VOICES` con su
motivo— y otro que exige que el banco las pinte todas. Una voz nueva sin suceso
documentado no llega a pasar la suite. Lo pendiente se declara como pendiente en
vez de omitirse: omitirlo lo haría parecer inexistente, y quien buscara por qué no
suena no encontraría ni el hueco.

Nada de esto existe fuera de desarrollo.

## El final del §26

Cuatro de sus cinco tramos ya suenan, y ninguno se pisa con el siguiente:

| | Qué pasa | Qué suena |
| --- | --- | --- |
| 1 | Cada golpe despega la pared | **El crujido de desgarro**, y cruje más cuanto más cede |
| 2 | El pedazo cae | Un barrido descendente, y el impacto **detrás** |
| 3 | El ojo mira por el agujero | **La sala se da vuelta**, y los datos chacharean |
| 4 | Todo falla | **Silencio absoluto, 200 ms**, y después los relés del tema |
| 5 | Reinicia | El ciclo entero, porque reinicia **por dentro** |

⚠ **El crujido no es un glitch, y eso se corrigió.** Ahí sonaba `glitchBurst`, que
es el ruido de la **señal** rompiéndose: eléctrico, escalonado, de banda ancha. Lo
que pasa en la pantalla es otra cosa entera — un objeto físico pegado que cede a
golpes. Madera y yeso, no electrónica. El comentario del cableado ya lo llamaba
«el crujido» desde el primer día; sólo faltaba construirlo.

Sube con la misma `--blow-amp` que mueve la imagen, porque el §5 lo pide sin
rodeos: lo que reacciona no puede ser una muestra. Y sólo suelta el trozo final
cuando el golpe es fuerte — en los primeros la pared aguanta, y crujir sin soltar
nada es exactamente lo que hace algo que todavía no cede.

### ⚠ El ente no tiene voz, y eso es el personaje

Darle un sonido propio sería ponerle un instrumento a algo que lleva todo el juego
sin tener cuerpo. Lo que cambia cuando contesta él **no es lo que se oye: es lo
que deja de oírse.** La sala baja mientras dura su frase y vuelve sola, despacio —
la habitación entera se calla un poco para escucharlo, que es lo que hace una
habitación cuando alguien habla en serio.

⚠ Y **no se deduce del texto.** La minúscula lo distingue a la vista, pero fiarse
de eso sería atar el sonido a una convención de estilo: el día que una frase suya
empiece con un nombre propio, la sala dejaría de hacerle sitio sin que nada
fallara. Quien sabe quién contestó es quien resolvió, así que lo dice — y el
editor lo pinta como una clase, para que el sonido lo lea igual que lee todo lo
demás.

⚠ Y **agacharse no es invertirse.** Invertir es cambiar de sitio y se puede pedir
en cada repaso, porque es un destino. Agacharse es una bajada CON su vuelta
programada: repetirla cancelaría la vuelta y el zumbido se quedaría abajo para
siempre.

⚠ **La sala dada vuelta no es subir el volumen.** Subir la salida subiría también
el siseo de la caja, y entonces no habría inversión: habría más de lo mismo. Lo
que cambia es el **peso** — el zumbido sube y el aire se enmudece, así que deja de
oírse una habitación con una máquina dentro y pasa a oírse la máquina sola, de
cerca. Es el sonido de estar mirando algo que te mira. Va y vuelve despacio: un
ambiente que se da vuelta de golpe es un suceso, y esto no es un suceso, es un
sitio distinto.

Y el chachareo son **datos, no música**: ráfagas cortísimas de tonos altos a
alturas que no forman ninguna escala. En cuanto dos de esos tonos guardan una
relación reconocible el oído los lee como una melodía, y una melodía ahí contaría
que alguien la escribió — cuando lo que se está viendo es una máquina volcando lo
que tiene dentro.

⚠ **Y el reinicio del final ya no es una recarga.** Terminaba en un
`location.reload()`, y lo que nace después no tiene permiso para sonar: el final
del juego acababa en un arranque **mudo**, que es el peor sitio posible para
quedarse sin sonido. Ahora reinicia por dentro, como `//reboot`, así que el ciclo
entero se oye como se ve. La recarga queda de respaldo por si nadie pasó el
reinicio: mejor volver muda que no volver.

⚠ **Y el silencio es de verdad.** No basta con callar el zumbido: justo ahí empieza
el parpadeo de tema, que dispara relés, y un silencio con clics dentro no es un
silencio. Se corta en `mix.ts`, en el único embudo por el que pasan todas las
voces, para que ninguna se escape por su cuenta. El plan lo llama «el recurso más
barato y más fuerte del documento entero», y no cuesta ni un fichero.

## Lo que falta

- **El condensador.** La voz existe (`capacitor`) y todavía no tiene momento: un
  condensador soltándose dentro de la caja pide un suceso que hoy no ocurre.
- **Las muestras.** Cero por ahora, y ésa era la idea: sintético primero, y una
  muestra CC0 sólo donde el sintético falle la prueba de oído.
