import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Worker } from './Worker.ts';
import { IProcessRepo } from '../../repos/IProcessRepo.ts';
import { ISummarizer } from '../../services/ISummarizer.ts';
import { Process } from '../../domain/Process.ts';
import { PROCESS_STATUS } from '../../domain/ProcessStatus.ts';

describe('Worker Use Case', () => {
  let mockRepo: IProcessRepo;
  let mockSummarizer: ISummarizer;
  let worker: Worker;

  beforeEach(() => {
    // We create Mocks for the dependencies. 
    // This is possible because Worker depends on Interfaces (DIP), not concrete classes.
    mockRepo = {
      findById: vi.fn(),
      save: vi.fn(),
      listAll: vi.fn(),
    } as unknown as IProcessRepo;

    mockSummarizer = {
      summarize: vi.fn().mockResolvedValue('Mocked Summary'),
    };

    worker = new Worker({
      processRepo: mockRepo,
      summarizer: mockSummarizer
    });
  });

  it('should process files and update repository multiple times', async () => {
    const process = Process.create([{ name: 'doc.txt', content: 'content' }]);
    const processId = process.toDto().id;

    // Setup mock return values
    vi.mocked(mockRepo.findById).mockResolvedValue(process);

    await worker.execute(processId);

    // 1. Worker called findById
    expect(mockRepo.findById).toHaveBeenCalledWith(processId);
    
    // 2. Worker called the injected summarizer
    expect(mockSummarizer.summarize).toHaveBeenCalledWith('content');

    // 3. Worker saved the progress (at least once for start and once per file)
    expect(mockRepo.save).toHaveBeenCalled();
    
    // 4. Domain logic was applied: process is now COMPLETED
    expect(process.status).toBe(PROCESS_STATUS.COMPLETED);
  });

  it('should abort if process is stopped externally', async () => {
    const process = Process.create([{ name: 'doc.txt', content: 'content' }]);
    process.start();
    process.stop(); // Manually stop it
    
    vi.mocked(mockRepo.findById).mockResolvedValue(process);

    await worker.execute(process.toDto().id);

    // Summarizer should NOT be called if stopped
    expect(mockSummarizer.summarize).not.toHaveBeenCalled();
  });
});
