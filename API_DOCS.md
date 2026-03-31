# Document Processing API Documentation

This document provides a detailed specification of the REST API endpoints available in the Document Processing System.

---

## 1. Process Management

### Start a New Process
Initiates an asynchronous analysis of a batch of text files.

*   **URL:** `/process/start`
*   **Method:** `POST`
*   **Request Body:**
    ```json
    {
      "files": [
        {
          "name": "document1.txt",
          "content": "Full text content here..."
        },
        {
          "name": "document2.txt",
          "content": "Another document content..."
        }
      ]
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "process_id": "uuid-string"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid payload structure or missing files.
    *   `500 Internal Server Error`: Unexpected system error.

---

### List All Processes
Retrieves a summary of all processing tasks stored in the system.

*   **URL:** `/process/list`
*   **Method:** `GET`
*   **Success Response (200 OK):**
    ```json
    [
      {
        "process_id": "uuid-1",
        "status": "COMPLETED",
        "progress": { "percentage": 100, ... },
        "startedAt": "2024-01-15T..."
      },
      {
        "process_id": "uuid-2",
        "status": "RUNNING",
        "progress": { "percentage": 45, ... },
        "startedAt": "2024-01-15T..."
      }
    ]
    ```

---

### Stop a Specific Process
Requests the immediate termination of a running process.

*   **URL:** `/process/stop/{process_id}`
*   **Method:** `POST`
*   **Success Response (200 OK):**
    ```json
    {
      "process_id": "uuid-string",
      "status": "STOPPED",
      "progress": { ... },
      "startedAt": "...",
      "completedAt": "..."
    }
    ```
*   **Error Responses:**
    *   `404 Not Found`: Process ID does not exist.

---

## 2. Monitoring & Results

### Get Process Status
Queries the real-time status and progress of a task.

*   **URL:** `/process/status/{process_id}`
*   **Method:** `GET`
*   **Success Response (200 OK):**
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
      "estimated_completion": "2024-01-15T10:32:00Z"
    }
    ```

---

### Get Analysis Results
Retrieves the final data extracted from the documents. Only available when the process is `COMPLETED`.

*   **URL:** `/process/results/{process_id}`
*   **Method:** `GET`
*   **Success Response (200 OK):**
    ```json
    {
      "total_words": 1500,
      "total_lines": 75,
      "total_characters": 8500,
      "most_frequent_words": ["the", "of", "and", "to", "a"],
      "files_processed": ["doc1.txt", "doc2.txt"],
      "fileSummaries": {
        "doc1.txt": "AI generated summary...",
        "doc2.txt": "AI generated summary..."
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Results are not ready yet (process still running or failed).
    *   `404 Not Found`: Process ID does not exist.

---

## 3. System States

The system uses the following state machine:

| State | Description |
| :--- | :--- |
| `PENDING` | Created but not yet picked up by the worker. |
| `RUNNING` | Currently being analyzed by the worker. |
| `COMPLETED` | Successfully finished with all results available. |
| `FAILED` | Terminated due to an internal error. |
| `STOPPED` | Manually terminated by the user. |
