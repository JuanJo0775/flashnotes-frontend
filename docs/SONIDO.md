# El sonido de la máquina · lo que está construido

> Este documento cuenta lo que **existe y suena**, no lo que se planeó. El plan
> vive en `plans/2026-09-07-sonido.md` y sigue siendo la referencia de por qué
> las cosas son como son; acá está lo que se hizo, lo que se descubrió haciendo
> y lo que todavía no.
>
> Las tablas de esta página están **atadas al código por `tests/docs/sonido.test.ts`**.
> Si alguien cambia un nivel y no lo cambia acá, la suite lo dice.

## ⚠ Cuatro cosas que se aprendieron fallando

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

**Entra con lo primero que hagas y se va solo.** Sube en 4 segundos —de golpe se
oiría ENTRAR, y entonces dejaría de ser ambiente para ser un suceso— y se apaga
tras **40 000 ms** sin actividad: bastante más de lo que dura una pausa
escribiendo, bastante menos de lo que dura irse a leer otra cosa.

Y sabe callarse de dos maneras distintas, que no son la misma:

| | Qué hace | Para qué |
| --- | --- | --- |
| `duck` | Lo baja y lo devuelve | Cuando habla el ente: la sala se calla para escucharlo |
| `silence` | Lo pone en **cero exacto** | El derrumbe. Un ambiente a −60 dB sigue estando ahí |

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
| Botones | `click` en el documento, en captura | no |
| Arranque, barrido, colapso, apagado | los atributos que la app ya pone en el documento | no |
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

Todo esto cuelga de **atributos que la app ya pone en el documento** porque los
necesita para el CSS —el arranque apaga a sus hermanos, el barrido desvanece la
app entera—, así que enterarse no le pide nada a nadie:

| Atributo | Qué suena |
| --- | --- |
| `data-booting` | El tubo prendiéndose, y 620 ms después el cabezal buscando |
| `data-tube-off` | El tubo al que le cortan la corriente |
| `data-wiping`, `data-collapsing` | El barrido largo, y un impacto lejano detrás |
| `data-theme` | Un relé por cada cambio. Es lo que hace el parpadeo del tema roto |

⚠ **Sólo cuenta la aparición.** Un observador ingenuo dispara con cualquier
cambio, y entonces el arranque sonaría dos veces: al empezar y al acabar.

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

## Lo que el navegador impone

Todo `AudioContext` nace suspendido hasta que hay un gesto. En la **primera
visita de la vida** no hay forma de sonar, y el arranque es mudo. No es un
obstáculo: la máquina está muda hasta que la tocás.

⚠ **Pero se intenta igual, y no es inútil.** Chrome levanta esa restricción en
sitios con los que ya has interactuado bastante, así que en las visitas
siguientes el arranque SÍ puede sonar — y no intentarlo era garantizar que no
sonara nunca. Si el navegador lo bloquea no pasa nada: el contexto queda dormido
y el primer gesto lo despierta, porque `ensureAudio` reintenta en cada llamada.

## Dónde escucharlo

`/banco` tiene la sección de sonido: cada voz suelta, las capas de la tecla por
separado, la sala en un mando y un área para escribir rápido y comprobar la
compuerta. No existe fuera de desarrollo.

## Lo que falta

- **El final** (§26): el crujido que sube con cada golpe, la caída, el ojo, los
  200 ms de silencio absoluto y el reinicio.
- **La entrega de arte cableada.** La voz existe (`drawer`) y todavía no cuelga
  de `awardPiece`.
- **Las muestras.** Cero por ahora, y ésa era la idea: sintético primero, y una
  muestra CC0 sólo donde el sintético falle la prueba de oído.
