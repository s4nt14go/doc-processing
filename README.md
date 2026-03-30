# Document Processing System

## 1. Technical Architecture (Cloud Native with SST v4)

*   **REST API:** `sst.aws.Api` (AWS API Gateway) to expose the requested REST endpoints.
*   **Asynchronicity:** `sst.aws.Queue` (SQS) to decouple request reception from heavy processing.
*   **Database:** PostgreSQL managed with **Sequelize ORM** for persisting states and results.
*   **Intelligent Processing:** Integration with **Google Gemini API** (chosen for its generous free tier) to generate content summary.

## 2. Module Structure (DDD)

The system's core will reside in `src/modules/documentProcessing/`:

```text
./
├── scripts/                # Client TypeScript scripts
│   ├── start_process.ts    # POST /process/start
│   ├── list_processes.ts   # GET /process/list
│   ├── get_status.ts       # GET /process/status/{id}
│   ├── get_results.ts      # GET /process/results/{id}
│   └── stop_process.ts     # POST /process/stop/{id}
├── src/
│   ├── modules/documentProcessing/
│   │   ├── domain/         # Entities and Enums (Process, ProcessStatus)
│   │   ├── repos/          # Repositories (IProcessRepo, ProcessRepo)
│   │   └── useCases/       # Application logic
│   │       ├── startProcess/
│   │       ├── listProcesses/
│   │       ├── getStatus/
│   │       ├── getResults/
│   │       ├── stopProcess/
│   │       └── worker/     # SQS Consumer logic
│   └── shared/
│       ├── core/           # DDD Base Classes
│       └── infra/          # Infrastructure implementations
│           ├── ai/         # AI Adapter (Gemini)
│           ├── iac/        # SST/Pulumi constructs (API, Queue)
│           ├── logger/     # Centralized logging
│           ├── sequelize/  # Database (models, migrations)
│           └── sqs/        # Message Broker implementation
├── sst.config.ts           # SST v4 entry point
└── package.json            # Scripts and dependencies
```

## 3. Processing Flow

1.  **Reception:** The `POST /process/start` endpoint validates files, creates a `PENDING` record in the DB, and sends a message to SQS with the `process_id`.
2.  **Worker:** A Lambda function subscribed to SQS initiates the process:
    *   Changes the state to `RUNNING`.
    *   **Batching:** Reads files in configurable batches.
    *   **Analysis:** For each file, calculates statistics and word frequency.
    *   **AI:** Calls **Google Gemini API** to generate an intelligent summary of the processed document batch.
    *   **Update:** Updates progress and partial results in the DB.
3.  **Finalization:** Upon completion, the state changes to `COMPLETED`. If a fatal error occurs, it changes to `FAILED`.

## 4. System States

The system implements the following states to manage the lifecycle of a document processing task:

*   **PENDING**: Process created in the database but not yet picked up by the worker.
*   **RUNNING**: Processing is currently in progress (files are being analyzed).
*   **PAUSED**: Process temporarily paused (available for future implementation).
*   **COMPLETED**: Process finished successfully, and all results are available.
*   **FAILED**: Process terminated due to an error during execution.
*   **STOPPED**: Process was manually stopped by the user via the API.

## 5. API Endpoints Reference

### Process Management
*   **POST `/process/start`**: Initiates a new analysis process. Returns a `process_id`.
*   **POST `/process/stop/{id}`**: Marks a specific process as `STOPPED`. The worker will check this flag before processing the next batch to stop safely.
*   **GET `/process/list`**: Returns a list of all processes and their current states.

### Monitoring & Results
*   **GET `/process/status/{id}`**: Returns the full process object, including real-time `progress` percentage and current `status`.
*   **GET `/process/results/{id}`**: Retrieves the analysis data. Once `COMPLETED`, it returns the full `results` object (word counts, intelligent summary, etc.).

### Response Format Example (`/status/{id}`)
```json
{
  "process_id": "uuid-string",
  "status": "RUNNING",
  "progress": {
    "total_files": 10,
    "processed_files": 3,
    "percentage": 30
  },
  "started_at": "2024-01-15T10:30:00Z",
  "estimated_completion": "2024-01-15T10:32:00Z",
  "results": {
    "total_words": 1500,
    "total_lines": 75,
    "most_frequent_words": ["the", "of", "and", "to", "a"],
    "files_processed": ["doc1.txt", "doc2.txt", "doc3.txt"]
  }
}
```

## 6. Debugging & Testing Hooks

The Worker includes hooks that can be activated via environment variables (e.g., AWS Console) to facilitate testing of edge cases:

*   `TEST_WORKER_DELAY_SECONDS`: Adds a delay (in seconds) after processing each file. Useful for testing the **STOP** functionality.
*   `TEST_WORKER_FORCE_FAILURE`: If set to `true`, the Worker will throw an error during processing to test the **FAILED** state logic.

## 7. Client Scripts

The project includes TypeScript scripts to interact with the API from the terminal. These scripts automatically use the `API_URL` defined in your `.env` file.

### Start a Process
Uploads all `.txt` files from a folder in batches.
```bash
npm run start-process scripts/test_docs
```

### List Processes
Retrieves a list of all processes and their current states.
```bash
npm run list-processes
```

### Check Process Status
Retrieves the current status, progress, and results of a process.
```bash
npm run get-status <process_id>
```

### Get Process Results
Retrieves the full analysis results (only if status is COMPLETED).
```bash
npm run get-results <process_id>
```

### Stop a Process
Manually stops a running process.
```bash
npm run stop-process <process_id>
```