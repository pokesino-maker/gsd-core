# Plan de Mapeo Exhaustivo de Optimizaciones con Code-Review-Graph

Analizar uno por uno todos los agentes (en `agents/`) en busca de lógicas y comandos ineficientes (tipo `read`, `bash`, `glob`, `grep`) y registrar en `CODE-REVIEW-GRAPH/agents_mapping.json` su traducción exacta y optimizada para el uso del servidor MCP local `code-review-graph`.

El plan incluye documentar la correspondencia teórica de comandos tradicionales frente a las herramientas de CRG para optimizar el consumo de tokens.

## Protocolo de Detención e Informe (Regla Crítica de Ejecución)

> [!IMPORTANT]
> Si durante el análisis exhaustivo e individualizado de los agentes y workflows se detecta cualquier sección, lógica o patrón de comportamiento susceptible de ser optimizado con `code-review-graph` que **no haya sido previsto inicialmente** en las tablas de relación o represente una oportunidad de mejora significativa imprevista:
>
> 1. Se detendrá inmediatamente la tarea de escaneo y escritura.
> 2. Se informará de forma detallada al usuario sobre el hallazgo.
> 3. No se reanudará la ejecución hasta obtener la confirmación y guía del usuario sobre cómo incorporar dicho hallazgo al mapeo.

---

## Catálogo Completo de las 30 Herramientas MCP

A continuación se detalla la lista exacta de las 30 herramientas MCP disponibles en `code-review-graph` para que puedas mapear la lógica de las skills a las herramientas correctas:

### 1. Gestión del Grafo e Indexación

* `build_or_update_graph_tool`: Construye desde cero o actualiza incrementalmente el grafo del proyecto.
* `run_postprocess_tool`: Ejecuta de nuevo la detección de flujos, detección de comunidades y el indexado de búsqueda de texto completo (FTS).
* `embed_graph_tool`: Calcula o recalcula los embeddings vectoriales para la búsqueda semántica.
* `list_graph_stats_tool`: Entrega estadísticas de tamaño, salud y cobertura del grafo.

### 2. Contexto de Revisión y Análisis de Cambios

* `get_minimal_context_tool`: Proporciona un contexto ultra-compacto (~100 tokens) con información básica del grafo. Suele llamarse al inicio.
* `get_impact_radius_tool`: Calcula el "radio de impacto" (blast radius) de un conjunto de archivos modificados, identificando funciones llamadas, clases y tests afectados.
* `get_review_context_tool`: Genera un contexto de revisión optimizado en tokens con resúmenes estructurales específicos de los cambios.
* `detect_changes_tool`: Realiza un análisis de riesgo detallado mapeando los diffs con funciones críticas del sistema y brechas en tests unitarios.

### 3. Navegación y Consultas de Relaciones (AST)

* `query_graph_tool`: Realiza consultas relacionales directas sobre nodos del grafo (ej: buscar call-sites, callees, callers, herencia, importaciones de un archivo o clase específica).
* `traverse_graph_tool`: Realiza un recorrido libre tipo BFS/DFS por el grafo de dependencias, respetando un límite estricto de profundidad y presupuesto de tokens.
* `find_large_functions_tool`: Localiza funciones o clases que superan un umbral específico de líneas de código (detección de refactorizaciones).

### 4. Búsqueda y Documentación

* `semantic_search_nodes_tool`: Busca entidades de código por similitud semántica o conceptual (ej: "dónde se valida la contraseña").
* `get_docs_section_tool`: Recupera secciones y referencias de documentación indexada asociadas a componentes del código.

### 5. Análisis de Flujos de Ejecución (Call Chains)

* `list_flows_tool`: Lista todos los flujos de ejecución detectados (puntos de entrada a salidas), ordenados por su criticidad arquitectónica.
* `get_flow_tool`: Devuelve el desglose detallado (call stack secuencial) de un flujo de ejecución específico.
* `get_affected_flows_tool`: Identifica qué flujos de ejecución o procesos de negocio se ven afectados por un grupo de archivos modificados.

### 6. Análisis de Comunidades y Arquitectura

* `list_communities_tool`: Lista todas las comunidades estructurales de código detectadas mediante el algoritmo de Leiden.
* `get_community_tool`: Devuelve la información y los archivos pertenecientes a una comunidad de código específica.
* `get_architecture_overview_tool`: Genera un resumen del mapa arquitectónico basado en la separación de responsabilidades y acoplamiento de las comunidades de código.
* `get_hub_nodes_tool`: Encuentra los nodos más conectados del grafo (hotspots de arquitectura con alto acoplamiento).
* `get_bridge_nodes_tool`: Identifica chokepoints estructurales (nodos con alta centralidad de intermediación que conectan diferentes comunidades).
* `get_knowledge_gaps_tool`: Encuentra debilidades en el grafo (código sin testear, dependencias circulares o nodos aislados).
* `get_surprising_connections_tool`: Alerta sobre acoplamientos inesperados (ej: dependencias entre comunidades separadas o entre lenguajes diferentes).
* `get_suggested_questions_tool`: Auto-genera preguntas de revisión basadas en las anomalías encontradas en el grafo.

### 7. Refactorización Asistida por Grafo

* `refactor_tool`: Genera una previsualización de cambios de refactorización (ej: renombrados seguros, eliminación de código muerto) a nivel de grafo.
* `apply_refactor_tool`: Aplica de forma segura una refactorización previamente previsualizada sobre los archivos reales del codebase.

### 8. Generación de Wikis

* `generate_wiki_tool`: Genera una wiki completa en formato markdown estructurada por comunidades a partir de los metadatos del grafo.
* `get_wiki_page_tool`: Recupera una página de wiki específica previamente generada.

### 9. Multi-Repositorio

* `list_repos_tool`: Lista todos los repositorios registrados en el demonio del sistema (`crg-daemon`).
* `cross_repo_search_tool`: Permite realizar búsquedas cruzadas entre todos los repositorios registrados en el sistema.

---

## Tabla de Relación: Comandos de Grep vs Herramientas de CRG

A continuación se detalla la relación exhaustiva de correspondencia entre los comandos concretos de `grep` utilizados en GSD-Core y las herramientas específicas del servidor MCP `code-review-graph` para optimizar el consumo de tokens y evitar escaneos de texto en bruto:

| Comando de Grep Original en GSD-Core | Propósito del Comando | Herramienta de CRG Equivalente | Rationale de Ahorro y Eficiencia |
|:---|:---|:---|:---|
| `grep -rn "TODO\|FIXME\|HACK\|XXX" src/` | Buscar deuda técnica o pendientes en el código. | `semantic_search_nodes_tool` (query: "TODO") o `get_knowledge_gaps_tool` | Accede al índice FTS5 de comentarios y nodos del grafo SQLite, evitando escaneos de disco de múltiples extensiones. |
| `grep -r "import.*stripe\|aws\|supabase" src/` | Detectar SDKs y dependencias externas usadas. | `query_graph_tool` (pattern: `imports_of` o `importers_of`) | Extrae la lista de dependencias directas desde los metadatos AST del grafo sin realizar análisis de regex sobre archivos. |
| `grep -r "^import" src/` | Mapear la arquitectura, capas e importaciones globales. | `get_architecture_overview_tool`, `list_communities_tool` o `query_graph_tool` (pattern: `file_summary`) | Obtiene la estructura jerárquica y el acoplamiento entre módulos directamente a partir de las comunidades Leiden. |
| `grep -rn "return null\|return \[\]\|return {}"` | Detectar stubs vacíos o implementaciones incompletas. | `semantic_search_nodes_tool` (query: "return null") o `get_knowledge_gaps_tool` | Identifica nodos del grafo con retornos vacíos o desconectados mediante análisis estático. |
| `grep -n -E "(password\|secret\|api_key\|token)..."` | Escanear secretos y credenciales en texto plano. | `detect_changes_tool` o `get_review_context_tool` | Integra la validación de seguridad directamente sobre los diffs de git, mapeándolos en el árbol de riesgo de la base de datos local. |
| `grep -n -E "eval\(` y otras funciones inseguras | Identificar vulnerabilidades y funciones peligrosas. | `detect_changes_tool` o `semantic_search_nodes_tool` (kind: "Function", query: "eval") | Localiza los nodos que representan invocaciones peligrosas directamente en el AST, eliminando falsos positivos en comentarios o strings. |
| `grep -n -E "catch\s*\([^)]*\)\s*\{\s*\}"` | Localizar bloques de captura de excepciones vacíos. | `detect_changes_tool` o `get_review_context_tool` | Identifica construcciones sintácticas vacías directamente desde el parser Tree-sitter de los archivos cambiados. |
| `grep -r "import.*$export_name"` + `grep -r "$export_name"` | Comprobar que un export es importado y llamado. | `query_graph_tool` (pattern: `importers_of` o `callers_of`) | Consulta directamente los call-sites y relaciones de importación en el grafo de base de datos sin búsquedas recursivas en disco. |
| `grep -r "fetch.*$route\|axios.*$route"` | Verificar que un endpoint de API tiene consumidores. | `query_graph_tool` (pattern: `callers_of`) o `semantic_search_nodes_tool` (query: endpoint path) | Encuentra los callers de los handlers asociados al endpoint mapeados en el call graph. |
| `grep -E "useAuth\|getCurrentUser"` en rutas | Verificar protección de autenticación en controladores. | `query_graph_tool` (pattern: `callers_of` de las funciones de autenticación) | Traza la jerarquía de llamadas del middleware de auth en el call graph para asegurar su cobertura. |
| `grep -rn "import.*"` + ordenado por frecuencia | Detectar hotspots de acoplamiento y dependencias críticas en la arquitectura. | `get_hub_nodes_tool` o `get_bridge_nodes_tool` | Encuentra de forma estructural los nodos de alto acoplamiento o cuellos de botella lógicos directamente del call graph. |
| `grep -r` cruzados buscando dependencias Frontend/Backend prohibidas | Detectar dependencias cruzadas o violaciones de fronteras arquitectónicas. | `get_surprising_connections_tool` | Alerta automáticamente sobre conexiones o acoplamientos inesperados entre diferentes comunidades o lenguajes del grafo. |
| Scripts personalizados o `grep -c "^"` para estimar tamaño de funciones | Identificar funciones o clases sobredimensionadas que requieren refactorización. | `find_large_functions_tool` (con límite de líneas) | Inspecciona sintácticamente el AST para devolver las entidades que excedan el límite de líneas, evitando escaneos burdos. |
| `grep -rn` buscando debilidades de cobertura o fallos comunes | Generar checklists y preguntas clave de revisión arquitectónica. | `get_suggested_questions_tool` | Autogenera preguntas de revisión técnica basadas en anomalías lógicas y debilidades del grafo de dependencias. |

## Tabla de Relación: Patrones de Glob vs Herramientas de CRG

A continuación se detalla la relación de correspondencia para los patrones de `glob` y búsquedas de archivos en GSD-Core que pueden ser suplidos eficientemente por las herramientas de CRG:

| Patrón de Glob Original en GSD-Core | Propósito del Mapeo | Herramienta de CRG Equivalente | Rationale de Ahorro y Eficiencia |
|:---|:---|:---|:---|
| `find . -name "*.test.*" -o -name "*.spec.*"` | Localizar todos los archivos de prueba del proyecto. | `semantic_search_nodes_tool` (kind: "Test", query: "*") | Consulta directamente el tipo de nodo "Test" indexado en la base de datos sin escanear el sistema de archivos. |
| `find src -name "*.tsx" -path "*/components/*"` | Listar componentes visuales React/UI creados. | `semantic_search_nodes_tool` (kind: "Class") o `query_graph_tool` (pattern: `children_of`) | Mapea las clases de componentes directamente desde la estructura del grafo sin búsquedas recursivas en disco. |
| `find . -type d -not -path '*/node_modules/*'` | Mapear la estructura física de directorios del proyecto. | `list_communities_tool` o `get_architecture_overview_tool` | Reemplaza la estructura física plana de carpetas por agrupaciones modulares lógicas basadas en comunidades Leiden. |
| `find src -name "*.css" -o -name "*.scss"` | Listar las hojas de estilo y variables CSS. | `semantic_search_nodes_tool` (kind: "File", query: ".css") | Permite localizar y agrupar archivos de estilos mediante búsqueda por extensión en la base de datos local. |
| `find src -name "index.*"` | Encontrar los puntos de entrada (entrypoints) de los módulos y APIs internas. | `semantic_search_nodes_tool` (kind: "File", query: "index") | Localiza los archivos de exportación centralizados directamente en el índice del grafo, evitando búsquedas recursivas por directorios. |
| Búsqueda de subclases o clases derivadas (`find . -name "*.ts" -exec grep "extends BaseClass"`) | Encontrar todas las clases que implementan o heredan de una base. | `query_graph_tool` (pattern: `inheritors_of`, target: "BaseClass") | Resuelve la jerarquía de clases de forma sintáctica directa mediante el AST en el grafo, eliminando falsos positivos e inspección en disco. |
| Mapear qué archivos pertenecen a un directorio específico (`find src/utils -name "*.ts"`) | Enumerar y resumir los archivos y componentes lógicos contenidos en un módulo. | `query_graph_tool` (pattern: `children_of`, target: "src/utils") | Devuelve la lista de nodos y dependencias de forma directa, permitiendo entender su composición sin listar archivos planos en bruto. |
| Buscar las pruebas unitarias asociadas a un archivo específico (`find tests -name "*mi-modulo*.test.*"`) | Localizar los tests asignados a una funcionalidad o clase concreta. | `query_graph_tool` (pattern: `tests_for`, target: "MiModulo") | Relaciona la lógica de prueba con la lógica de negocio a través de la red de dependencias del grafo de control, en lugar de relying en nomenclatura de archivos. |
| `find docs/ -name "*.md"` buscando manuales y guías del código | Localizar documentación y secciones técnicas indexadas asociadas a módulos. | `get_docs_section_tool` o `get_wiki_page_tool` | Recupera referencias de documentación directamente mapeadas con componentes estructurales, evitando rastrear archivos markdown sueltos. |
| `find src/ -name "*workflow*"` buscando controladores de procesos | Identificar flujos de negocio principales y puntos de entrada/salida. | `list_flows_tool` o `get_flow_tool` | Devuelve listados y call stacks estructurados de flujos del negocio lógicos en lugar de rely en nombres descriptivos de archivos. |
| `find ../ -maxdepth 2 -name "package.json"` buscando dependencias vecinas | Localizar otros repositorios vinculados al sistema. | `list_repos_tool` o `cross_repo_search_tool` | Busca componentes e interactúa de forma cruzada entre repositorios indexados en el demonio del sistema directamente. |

---

## Tabla de Relación: Comandos de Read vs Herramientas de CRG

A continuación se detalla la relación de correspondencia para las operaciones de lectura de archivos (`read`, `cat`, `view_file`) que pueden ser delegadas a CRG para optimizar el consumo de tokens:

| Operación de Lectura Original (Read) | Propósito de la Lectura | Herramienta de CRG Equivalente | Rationale de Ahorro y Eficiencia |
|:---|:---|:---|:---|
| Leer un archivo completo (`cat archivo.js` o `view_file`) para ver qué exporta o define. | Inspección de estructura, firmas y composición de un archivo. | `query_graph_tool` (pattern: `file_summary`, target: "archivo.js") | Devuelve un mapa simplificado de nodos (clases, funciones, imports) y firmas, ahorrando los tokens de leer todo el cuerpo del código. |
| Leer en cascada múltiples archivos importados para rastrear el flujo de dependencias. | Mapear la cadena de dependencias o flujo de datos entre archivos. | `query_graph_tool` (pattern: `imports_of` o `importers_of`) o `traverse_graph_tool` | Recupera y mapea relaciones de importación estructuradas directamente desde la base de datos sin tocar el disco de forma recursiva. |
| Leer archivos de test completos para determinar la cobertura o qué funciones prueban. | Asociar casos de prueba a la lógica del negocio. | `query_graph_tool` (pattern: `tests_for` o `callees_of` del test) | Permite relacionar lógicamente las pruebas y los call-sites mediante el grafo en un solo paso rápido. |
| Leer múltiples archivos donde se menciona una función para buscar ejemplos de su uso real. | Encontrar ejemplos de llamadas y firmas prácticas. | `query_graph_tool` (pattern: `callers_of`, target: "MiFuncion") | Retorna de forma directa los puntos de llamada (call sites) en el código sin tener que leer archivos enteros de forma exploratoria. |
| Leer archivos enteros que cambiaron en un commit para evaluar el impacto de las modificaciones. | Evaluar riesgos de impacto y regresión arquitectónica. | `get_impact_radius_tool` o `get_review_context_tool` (detail_level: "minimal") | Mapea visual y lógicamente el radio de impacto sobre otros componentes del grafo en lugar de obligar a leer diffs textuales masivos. |
| Leer archivos de manuales, wikis o markdown para entender componentes. | Recuperar la documentación de diseño y especificaciones asociadas al código. | `get_docs_section_tool` o `get_wiki_page_tool` | Extrae selectivamente fragmentos de documentación y de la wiki del grafo mapeados con el componente, sin leer archivos markdown completos. |
| Leer el cuerpo completo de las funciones de un archivo para estimar si tienen demasiada complejidad. | Analizar el tamaño y la complejidad de las entidades sintácticas de código. | `find_large_functions_tool` | Identifica entidades AST gigantes directamente sin leer e inspeccionar el código fuente del archivo entero. |
| Leer secuencialmente controlador, servicio y repositorio para mapear la cadena de llamadas de un caso de uso. | Mapear el stack de ejecución y flujo lógico de un proceso. | `get_flow_tool` o `list_flows_tool` | Devuelve el desglose secuencial exacto del flujo (call chain) lógicamente sin tener que leer todos los archivos intervinientes. |

---

## Tabla de Relación: Comandos de Bash vs Herramientas de CRG

A continuación se detalla la relación de correspondencia para comandos de terminal (`bash`, `shell`, `run_command`) y scripts de consola que pueden ser reemplazados de forma eficiente utilizando el grafo de CRG:

| Comando de Consola / Script de Bash | Propósito de la Ejecución | Herramienta de CRG Equivalente | Rationale de Ahorro y Eficiencia |
|:---|:---|:---|:---|
| `git diff` / `git show` para analizar archivos modificados y su impacto. | Evaluar el impacto de los cambios sobre el sistema de archivos y arquitectura. | `get_review_context_tool` y `get_impact_radius_tool` | Analiza el diff directamente contra la base de datos estructural, devolviendo el radio de impacto de forma visual y clasificada sin procesar diffs textuales gigantescos. |
| Scripts personalizados (con `grep`, `awk`, `sed`) para rastrear dependencias físicas entre archivos. | Mapear la cadena de dependencias o flujo de llamadas. | `query_graph_tool` (pattern: `imports_of` o `importers_of`) | Extrae y agrupa importaciones y relaciones en una sola consulta relacional indexada, en lugar de lanzar subprocesos múltiples y lentos en disco. |
| Ejecución de scripts CLI de terceros (`dependency-cruiser`, `cloc`) para mapear la arquitectura. | Obtener una vista de alto nivel y modularidad de la base de código. | `get_architecture_overview_tool` o `list_communities_tool` | Proporciona una clasificación modular instantánea basada en el algoritmo Leiden a partir del grafo AST local de forma nativa. |
| Scripts o herramientas CLI para detectar código muerto o funciones sin callers (`ts-prune`, `depcheck`). | Encontrar funciones, clases o archivos huérfanos. | `query_graph_tool` (pattern: `callers_of` o `importers_of` verificando relaciones entrantes en cero) | Resuelve de forma sintáctica directa los puntos de entrada huérfanos sin escaneos recursivos ruidosos en la terminal. |
| Scripts personalizados para buscar archivos de test asociados a un módulo de producción. | Encontrar el archivo de pruebas asociado a una lógica de negocio. | `query_graph_tool` (pattern: `tests_for`, target: "Modulo") | Mapea la relación lógica entre el código de producción y el código de prueba en base a llamadas e imports directos en el grafo. |
| Scripts bash para regenerar el mapa o base de datos de análisis estático local. | Reconstruir, actualizar o post-procesar el grafo e índices FTS del proyecto. | `build_or_update_graph_tool` y `run_postprocess_tool` | Sincroniza y actualiza incrementalmente el grafo y los índices sintácticos de forma controlada a través del demonio, evitando scripts bash de limpieza manual. |
| Scripts bash para concatenar markdowns y auto-generar la documentación del proyecto. | Generar wikis y especificaciones estructuradas por módulos o directorios. | `generate_wiki_tool` | Genera una wiki markdown estructurada y agrupada por comunidades de código reales de manera automática y consistente. |
| Scripts CLI para renombrar variables o refactorizar en cascada (`sed -i`, `perl`). | Aplicar o previsualizar renombrados seguros y eliminación de código muerto. | `refactor_tool` (previsualizar) y `apply_refactor_tool` (aplicar) | Realiza refactorizaciones atómicas y sintácticas analizando el call graph y AST, evitando corromper coincidencias parciales con regex del sistema. |

---

## Listado Completo de Agentes a Analizar

Analizaremos de forma individual cada uno de los 33 agentes del motor de GSD-Core para buscar lógicas sustituibles por `code-review-graph`:

1. **[gsd-advisor-researcher.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-advisor-researcher.md)**: Asistente de investigación y revisión técnica.
2. **[gsd-ai-researcher.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-ai-researcher.md)**: Investigador autónomo de integraciones y tecnología.
3. **[gsd-assumptions-analyzer.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-assumptions-analyzer.md)**: Analizador de supuestos y estado inicial del codebase.
4. **[gsd-code-fixer.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-code-fixer.md)**: Corrector automático de defectos y fallos en tests.
5. **[gsd-code-reviewer.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-code-reviewer.md)**: Revisión estática y adversarial de código.
6. **[gsd-codebase-mapper.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-codebase-mapper.md)**: Cartógrafo de la estructura y dependencias de la base de código.
7. **[gsd-debug-session-manager.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-debug-session-manager.md)**: Administrador de sesiones de depuración estructuradas.
8. **[gsd-debugger.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-debugger.md)**: Diagnóstico de fallos interactivo en ejecución y logs.
9. **[gsd-doc-classifier.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-doc-classifier.md)**: Clasificador de documentos y artefactos de documentación.
10. **[gsd-doc-synthesizer.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-doc-synthesizer.md)**: Sintetizador de requerimientos y guías del proyecto.
11. **[gsd-doc-verifier.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-doc-verifier.md)**: Validador de veracidad de claims técnicos frente al código real.
12. **[gsd-doc-writer.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-doc-writer.md)**: Redactor de especificaciones técnicas y documentación.
13. **[gsd-domain-researcher.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-domain-researcher.md)**: Investigador de terminología y conceptos del dominio de negocio.
14. **[gsd-eval-auditor.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-eval-auditor.md)**: Auditor de evaluaciones de prompts y benchmarks.
15. **[gsd-eval-planner.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-eval-planner.md)**: Planeador de sets de evaluación y aserciones.
16. **[gsd-executor.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-executor.md)**: Implementador de tareas de código y aserciones.
17. **[gsd-framework-selector.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-framework-selector.md)**: Evaluador de tecnologías y librerías externas.
18. **[gsd-integration-checker.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-integration-checker.md)**: Verificador de wiring, dependencias cruzadas y flujos E2E.
19. **[gsd-intel-updater.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-intel-updater.md)**: Actualizador de la base de datos de conocimiento de codebase.
20. **[gsd-nyquist-auditor.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-nyquist-auditor.md)**: Auditor de aserciones Nyquist y completitud de tests.
21. **[gsd-pattern-mapper.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-pattern-mapper.md)**: Mapeador de patrones de diseño locales a replicar.
22. **[gsd-phase-researcher.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-phase-researcher.md)**: Investigador puntual de preguntas técnicas específicas de la fase.
23. **[gsd-plan-checker.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-plan-checker.md)**: Evaluador estructural de planes de fase frente a requerimientos.
24. **[gsd-planner.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-planner.md)**: Diseñador de planes de fase con desglose de tareas.
25. **[gsd-project-researcher.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-project-researcher.md)**: Investigador holístico inicial para estructurar el setup del proyecto.
26. **[gsd-research-synthesizer.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-research-synthesizer.md)**: Sintetizador de reportes de investigación tecnológica.
27. **[gsd-roadmapper.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-roadmapper.md)**: Generador y secuenciador del plan de ruta (ROADMAP.md).
28. **[gsd-security-auditor.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-security-auditor.md)**: Auditor de vulnerabilidades del código y dependencias.
29. **[gsd-ui-auditor.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-ui-auditor.md)**: Auditor visual e interactivo de interfaces frontend desarrolladas.
30. **[gsd-ui-checker.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-ui-checker.md)**: Validador estático de especificaciones de UI.
31. **[gsd-ui-researcher.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-ui-researcher.md)**: Investigador y modelador de diseño visual de la interfaz.
32. **[gsd-user-profiler.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-user-profiler.md)**: Evaluador de perfiles de usuario y requerimientos de UX.
33. **[gsd-verifier.md](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/agents/gsd-verifier.md)**: Validador de completitud y paso de UAT final de la fase.

Adicionalmente, se auditarán todos los workflows de GSD en la carpeta `gsd-core/workflows/`.

---

## Proposed Changes

### Nueva Carpeta y Archivo JSON de Mapeo

#### [NEW] [agents_mapping.json](file:///c:/Users/Victor.M.G.R/Desktop/Proyectos%20IA/Personal/gsd-development/CODE-REVIEW-GRAPH/agents_mapping.json)

* **Propósito**: Almacenar el mapeo detallado uno por uno de las líneas y bloques de código a optimizar.
* **Contenido**: El JSON con las llaves `file_path`, `line_range`, `original_tools`, `suggested_mcp_tools`, `token_savings_tier`, `rationale`, `original_text` y `graph_text`.

---

## Plan de Ejecución

### Fase 1: Análisis y Mapeo Individual e Interactivo (Archivo por Archivo)

Procederemos con el análisis exhaustivo en **estricto orden alfabético** de todos los 33 agentes de la carpeta `agents/` y los workflows de `gsd-core/workflows/`. El flujo de trabajo por cada archivo será el siguiente:

1. **Auditoría local**: Leer e inspeccionar el archivo en busca de comandos tradicionales (`grep`, `glob`, `read`, `bash`) optimizables con CRG.
2. **Registro parcial**: Añadir los mapeos correspondientes a `CODE-REVIEW-GRAPH/agents_mapping.json`.
3. **Punto de parada**: Tras finalizar la auditoría y registro de un archivo, se detendrá la tarea, se informará al usuario del resultado de dicho archivo y se le pedirá confirmación explícita ("continuar") para pasar al siguiente elemento en orden alfabético.

### Fase 2: Escritura y Verificación Final

* Consolidar y validar el archivo `CODE-REVIEW-GRAPH/agents_mapping.json`.
* Asegurar que la sintaxis de la estructura de datos JSON sea 100% válida.

---

## Verification Plan

### Manual Verification

* Validar la validez de `agents_mapping.json` mediante un parser de JSON.
* Asegurar que cada `line_range` y `original_text` se correspondan exactamente con los archivos del repositorio en Git.
