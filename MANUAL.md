*[Magyar változat](MANUAL.hu.md)*

# SDL-88 Design Tool – User manual

## 1. Overview

The SDL-88 Design Tool is an editor and simulator for **SDL process diagrams** (ITU-T Z.100). It runs in the browser, on a canvas window system of its own.

* **Editor:** draw the processes of a system with the standard SDL symbols; the diagram is laid out automatically.
* **Simulator:** run the system step by step; every process instance has its own window, signals fly from window to window.
* **Message Sequence Chart:** the simulation is recorded as an MSC that can be exported.
* **SDL Theory:** a short introduction to SDL with live diagrams (Help menu, F1).

The tool is opened through **index.html**. Use a web server (for example `python -m http.server` in the folder, VS Code Live Server, or the web site): the examples are read from a folder, and a browser cannot read a folder from a file opened directly from disk (file://).

---
## 2. The screen and the windows

The workspace has a menu bar and the following windows:

| Window | What it is for |
|---|---|
| **Symbols** | the palette of SDL symbols, drag them onto a diagram |
| **Project** | the processes of the system, with their initial number of instances |
| **Process … – editor** | one editor window for every process |
| **Simulator** | controls of the simulation, the environment (env) and the log |
| **Message Sequence Chart** | the MSC of the running simulation |
| **process instance windows** | open during the simulation, one for every instance |

Working with the windows:

* **move:** drag the title bar
* **resize:** drag the grip in the bottom right corner
* **collapse / expand:** the small triangle in the title bar, or double click on the title bar
* **close:** the × in the title bar (closed windows can be shown again from the **Window** menu)
* the window you click comes to the front and becomes active (blue title bar); the keyboard works on the active window
* **Window / Default arrangement:** puts every window back to its place
* **Window / Tile editors**, **Tile process instances**, **Collapse all instances**
* **Window / Debug: mouse x,y:** the small coordinate window of the original 2019 version

---
## 3. Project and processes

A **project** (an SDL system) consists of **processes**. Every process has:

* a **name** (letters, digits and _),
* a **DCL** box with its variables,
* a **start transition**,
* **states**, and in every state **inputs** (and saves) with their transitions,
* the **number of initial instances**: how many instances exist when the simulation starts. 0 means: instances are only made by a **Create** symbol of another process (like GAME in the Guessing Game).

The **Project** window lists the processes as `NAME [initial instances]`.

* double click on a process: opens its editor
* **New** button: new process; **Open**: editor of the selected process
* right click or the **…** button: rename, initial instances, delete the process, rename the project

The same is in the **Process** menu (New process, Edit …, Rename …, Initial instances of …).

---
## 4. Drawing a process

The diagram is laid out automatically: you never place symbols by hand, you only say *where in the transition* a symbol goes. A process diagram shows:

* the **DCL** box and the **Start** symbol with the start transition,
* every **state** with its inputs side by side, every input with its transition below it,
* a **decision** continues straight down with its first branch, the other branches go to the right.

### 4.1 Inserting symbols

* **Drag a symbol from the Symbols window onto a symbol of the diagram:** it is inserted *after* that symbol. The symbol under the mouse is highlighted while dragging.
* **Or select a symbol in the diagram, then click a symbol in the Symbols window.**
* **Or right click a symbol:** Insert task / output / decision / create / timer.

Where the different symbols can go:

| Symbol | Drop it on |
|---|---|
| **Task, Output, Decision, Create, Timer** | any symbol of a transition (start, input, task, …, or the terminator: then it goes before it) |
| **Input, Save** | a state (new input of that state) or an input (new input next to it) |
| **State** | the background: new state; a terminator: it becomes a *nextstate* |
| **Stop** (circle with ×) | a terminator: the transition ends with stop |

A new symbol opens its text for editing at once.

### 4.2 Editing

* **double click** or **F2** (or Enter): edit the text of the selected symbol. Enter finishes, Shift+Enter is a new line (in tasks and outputs), Esc cancels.
* **Del:** delete the selected symbol. Deleting a decision keeps its first branch. Del on a nextstate turns it into stop.
* **right click** on a symbol: the menu of that symbol, for example
  * state: Add input, Add save, Edit text (rename), Delete
  * decision: Add branch
  * terminator: Nextstate / Stop, Go to state …
  * branch label (true / false / …): edit it, Delete branch (if there are more than two)
* **right click on the background:** New state, Fit to window, Zoom 100%
* **Edit / Undo (Ctrl+Z)** and **Redo (Ctrl+Y)** undo every change, also deletions.

Good to know:

* Renaming a state renames every nextstate that points to it.
* Writing the name of a state that does not exist into a nextstate creates that state.
* `-` as nextstate means: stay in the same state.

### 4.3 Moving around

* **mouse wheel:** scroll up and down; **Shift+wheel:** left and right
* **Ctrl+wheel:** zoom at the mouse
* **drag the background:** pan
* **0:** fit to window, **+ / -:** zoom

---
## 5. The text in the symbols

Names of variables, signals, states and processes are **case-insensitive** (`n` and `N` are the same). In tasks and outputs Shift+Enter makes a new line, it only matters for the look.

### 5.1 DCL – variables

The DCL box at the top of the start column declares the variables of the process. Every variable starts with 0 unless it gets an initial value:

```
n, m
credit := 100, name := 'abc'
```

Variables that get a value in a task or as an input parameter are created automatically, but reading a variable that was never declared and never set is an error.

### 5.2 Task

Statements separated by `;` or a new line:

```
n := 0
n := n + 1;  m := n * 2
n++
n--
set(now + 5, T)
reset(T)
print('n is', n)
```

* `x := expression` (or `x = expression`): assignment
* `x++`, `x--`: increment, decrement
* `set(time, T)`, `reset(T)`: timers, see chapter 7
* a function call alone, for example `print(...)`

### 5.3 Output

```
PROMPT to player
INIT(sender, n) to offspring
MSG(count)
WINNER to player; LOG(1) to env
```

* `SIGNAL(arguments) to receiver` – the arguments are expressions, they are evaluated when the signal is sent
* without `to …` the signal goes to an instance whose process has an input for this signal (first one that waits in a state accepting it), otherwise to the environment
* several signals in one output symbol: separated by `;`
* the receiver is a *pid expression*, see chapter 6

### 5.4 Input

```
CALL
INIT(player, n)
GUESS(m)
A, B
*
```

* `SIGNAL(param1, param2)`: the values of the signal are stored in these variables
* `A, B`: the same transition for several signals
* `*`: every signal that has no other input and is not saved in this state

### 5.5 Save

```
GUESS
PRODUCED, ACK
*
```

The listed signals are **kept in the queue** while the process is in this state; they are taken later, in another state. `*` saves everything that has no input here.

### 5.6 Decision

The question is an expression; a `?` at the end is allowed and ignored:

```
n = m ?
random(1, 6) ?
```

The **branch labels** (click them to edit) say which value goes where:

| Branch label | Taken when the value … |
|---|---|
| `true` / `false` (or yes / no, igen / nem) | is true / false |
| `3`, `'abc'`, `(5)` | equals it |
| `> 5`, `<= 2`, `/= 0`, `!= 0` | satisfies the comparison |
| `else` | no other branch matched |

Right click a decision: **Add branch**. If no branch matches, the simulation stops with an error.

### 5.7 Create

The name of a process: `GAME`. A new instance of it is created; in the creator `offspring` becomes the new instance, in the new one `parent` is the creator.

### 5.8 Terminators

* **nextstate** (the state symbol at the end of a transition): the name of a state, or `-` for the same state
* **stop** (circle with ×): the instance terminates; signals sent to it later are lost

---
## 6. Expressions

### 6.1 Values and operators

* **numbers:** `0`, `42`, `3.5`; **strings:** `'abc'` or `"abc"`; **booleans:** `true`, `false`
* **arithmetic:** `+  -  *  /`, `mod` (or `%`) and `rem`
  * `/` of two integers is an integer division: `7 / 2` is 3
  * `mod` is never negative: `-1 mod 5` is 4; `rem` keeps the sign: `-1 rem 5` is -1
  * `+` joins strings: `'Fork' + 2` is `'Fork2'`
* **comparison:** `=` or `==`, `/=` or `!=` or `<>`, `<`, `>`, `<=`, `>=` (strings are compared case-insensitively)
* **logic:** `and` (`&&`), `or`, `not` (`!`)
* **parentheses** as usual

### 6.2 Special names

| Name | Value |
|---|---|
| `self` | the pid of this instance |
| `sender` | the pid of the sender of the last consumed signal |
| `parent` | the instance that created this one (env for the initial instances) |
| `offspring` | the instance created last by this one |
| `now` | the current simulation time |
| `env` | the environment |

### 6.3 Functions

| Function | Result |
|---|---|
| `random(a, b)` | a random **integer** from a to b, both included |
| `random(n)` | a random integer from 1 to n |
| `abs(x)` | absolute value |
| `min(a, b, …)`, `max(a, b, …)` | smallest, largest |
| `floor(x)`, `round(x)` | rounding down, to the nearest |
| `print(…)` or `log(…)` | writes its arguments into the simulation log |

### 6.4 Using random

Every evaluation of `random` draws a new number, so the same model can behave differently in every run.

* a dice in a task: `dice := random(1, 6)`
* a random delay: `set(now + random(2, 4), T)` – the timer expires 2, 3 or 4 time units later
* a random choice in a decision: question `random(1, 2) ?` with branches `1` and `2`, or `random(1, 10) <= 3 ?` with branches `true` (30%) and `false` (70%)
* a random target: `PING to 'Server' + random(1, 3)` sends to Server1, Server2 or Server3

Random behaviour is good for showing races, but a simulation that did *not* show a problem (for example a deadlock) does not prove that the problem cannot happen – see the Dining Philosophers example.

---
## 7. Signals, receivers and time

### 7.1 Pid expressions – where a signal goes

The receiver after `to` can be

* `self`, `sender`, `parent`, `offspring`, `env`
* a variable holding a pid (for example `player`, that got `sender` earlier)
* the name of an instance: `GAME1`, `Villa3`
* the name of a process: `Server` – its first living instance
* any expression giving one of these: `'Villa' + (en mod n + 1)`

Instances are named after their process with a running number: MA1, GAME1, GAME2, …

### 7.2 Timers

* `set(now + 5, T)` in a task: timer T expires at time now+5. Setting a running timer again restarts it.
* `reset(T)`: stops timer T (and removes an expired T that is still in the queue).
* When a timer expires, the signal **T** arrives in the instance's own queue (sender = self). Write an input `T` to handle it.

### 7.3 Time

Time is discrete and starts at 0. **It only advances when nothing else can happen:** while any instance can execute or consume a signal, `now` does not change. Then the time jumps to the next timer expiry. Sending a signal takes no time.

---
## 8. Simulation

### 8.1 Controls (Simulator window)

| Button | Key | Effect |
|---|---|---|
| **Reset** | F9 | back to the start: the initial instances, empty queues, time 0 |
| **Step** | F10 | one symbol |
| **Transition** | Shift+F10 | a whole transition |
| **Run / Pause** | F8 | steps continuously |
| **Slower / Faster** | | the delay between steps while running |

The status line shows the time, the number of steps and the state of the simulation (paused, running, idle, ERROR, DEADLOCK?).

### 8.2 The environment (env)

The system gets signals from outside through the **env:** line:

```
CALL to MA
GUESS(3) to GAME1
PRODUCED
```

* type the signal and press **Enter** (or **Send**); the line stays open for the next one
* without `to …` the signal goes to an instance that has an input for it
* **▾** next to Send: the signals sent before, and suggestions for the signals the instances accept now
* the green line **accepts now →** shows which instance accepts which signal in its current state
* signals sent to `env` appear in the log (env ← …)

The instance windows appear when you first press Step / Run or send a signal.

### 8.3 Process instance windows

One window for every instance (`GAME1 : GAME`):

* the top shows the **state**, `sender`, `parent`, `offspring`, the **variables** and the **queue** (purple items are expired timers)
* the diagram highlights the **current state** (green) and the **symbol being executed** (yellow)
* a stopped instance is marked as stopped; an error is shown in red on the symbol that caused it
* **Simulation / Signal animation:** every signal flies as a small envelope from the sender's output symbol to the receiver's queue

### 8.4 What happens in one step

* An instance in a state takes the **first signal of its queue that is not saved**:
  * if the state has an input for it, the transition starts (the parameters get the values, `sender` is set),
  * otherwise the signal is **discarded** (implicit consumption, it appears in the log).
* A transition is executed symbol by symbol up to its terminator; other instances only continue after it.
* The instances take turns (round robin).
* If nothing can happen, the time advances to the next timer. If there is no timer either, the system waits for the environment (idle).

### 8.5 The log and its messages

| Message | Meaning |
|---|---|
| env → / env ← | a signal from / to the environment |
| X created Y | Create |
| discarded … in state … | the state had no input for the signal (and did not save it) |
| lost … | the receiver had already stopped |
| timer … expired | a timer signal arrived |
| ERROR … | the simulation stopped, e.g. undefined variable, no decision branch, unknown receiver |
| DEADLOCK? … | nothing can move, only saved signals wait in the queues |

After an error correct the model and press **Reset**.

---
## 9. Message Sequence Chart

The MSC window draws the simulation as it goes: a lifeline for env and for every instance, arrows for the signals with their values, dashed arrows for Create, × for Stop, states on the lifelines, and lines for the time steps.

* **States:** show / hide the states on the lifelines
* **Follow:** scroll with the simulation (scrolling up switches it off)
* **Export…** (also in the File menu): saves the MSC as text for **sequencediagram.org**
* drag or scroll the chart to look around

---
## 10. Files and examples

* **File / Save (Ctrl+S):** downloads the project as `Name.sdl.json`
* **File / Open… (Ctrl+O):** opens a `.sdl.json` file
* **File / New project:** an empty project
* The current project is also kept in the browser: after closing and opening the tool it is still there.

### 10.1 The examples folder

Every `*.sdl.json` file in the **examples/** folder appears in the File menu as *Example: name* (ordered by file name, the menu shows the name of the project).

* **Add an example:** File / Save, copy the file into `examples/`, then run `node tools/examples-index.js` (it writes `examples/index.json`, the list that the tool reads). With a web server that shows folder listings, **File / Reload examples** finds a new file even without this.
* **Hide an example** (for example during an exam): take the file out of the folder. A file listed in index.json but missing is simply left out of the menu. The tool keeps the last project in the browser: start a **New project** before the exam if that was one of the hidden examples.

Examples that come with the tool:

| File | What it shows |
|---|---|
| 01-guessing-game | create, offspring / parent / sender, decision, stop |
| 02-ping-pong | implicit addressing, save |
| 03-handshake | the simplest client–server exchange |
| 04-semaphore | timers (set / reset), decision with mod |
| 05-dining-philosophers-deadlock | a self-signal loop, pid expressions, save, random times, deadlock |
| 06-dining-philosophers-fixed | the same with the classic fix |
| 07-GuessingGame_Losers_atGuess_30sec | a game timer (30 time units), asking the parent for data (REQ / RESP), counting the losers |

---
## 11. Keyboard

| Key | Effect |
|---|---|
| F1 | SDL Theory |
| Shift+F1 | this manual |
| Ctrl+Z / Ctrl+Y | undo / redo |
| Ctrl+S / Ctrl+O | save / open |
| F2 or Enter | edit the selected symbol |
| Del | delete the selected symbol |
| 0, +, - | fit to window, zoom in, zoom out (in a diagram) |
| F9 / F10 / Shift+F10 / F8 | reset / step / transition / run–pause |
| Esc | close a menu, cancel editing |
| PgUp, PgDn, Home, End | scroll the theory and the manual |

---
## 12. Not supported (yet)

System and block diagrams with channels, join / label connectors, procedures, continuous signals, enabling conditions, signal declarations, and the exhaustive deadlock search (state space exploration).
