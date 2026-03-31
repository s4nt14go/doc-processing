import { describe, it, expect } from 'vitest';
import { Process } from './Process.ts';
import { PROCESS_STATUS } from './ProcessStatus.ts';

describe('Process Domain Entity', () => {
  const mockFiles = [
    { name: 'test1.txt', content: 'hello world' },
    { name: 'test2.txt', content: 'vitest is great' }
  ];

  it('should create a process in PENDING status', () => {
    const process = Process.create(mockFiles);
    
    expect(process.status).toBe(PROCESS_STATUS.PENDING);
    expect(process.filenamesToProcess).toEqual(['test1.txt', 'test2.txt']);
    expect(process.filesToProcess['test1.txt']).toBe('hello world');
  });

  it('should transition to RUNNING when started', () => {
    const process = Process.create(mockFiles);
    process.start();
    
    expect(process.status).toBe(PROCESS_STATUS.RUNNING);
    expect(process.progress).toEqual({
      totalFiles: 2,
      processedFiles: 0,
      percentage: 0
    });
    expect(process.startedAt).toBeInstanceOf(Date);
  });

  it('should throw error if starting a non-PENDING process', () => {
    const process = Process.create(mockFiles);
    process.start();
    
    expect(() => process.start()).toThrow('Cannot start process in status RUNNING');
  });

  it('should update progress and results correctly', () => {
    const process = Process.create(mockFiles);
    process.start();
    
    const results = {
      totalWords: 5,
      totalLines: 2,
      totalCharacters: 25,
      mostFrequentWords: ['world', 'hello'],
      filesProcessed: ['test1.txt'],
      fileSummaries: { 'test1.txt': 'A test summary' }
    };

    process.recordProcessResults(results);

    expect(process.progress?.processedFiles).toBe(1);
    expect(process.progress?.percentage).toBe(50);
    expect(process.results).toEqual(results);
    expect(process.status).toBe(PROCESS_STATUS.RUNNING);
  });

  it('should transition to COMPLETED when all files are processed', () => {
    const process = Process.create(mockFiles);
    process.start();
    
    process.recordProcessResults({
      totalWords: 10,
      totalLines: 4,
      totalCharacters: 50,
      mostFrequentWords: ['test'],
      filesProcessed: ['test1.txt', 'test2.txt'],
      fileSummaries: { 'test1.txt': 's1', 'test2.txt': 's2' }
    });

    expect(process.status).toBe(PROCESS_STATUS.COMPLETED);
    expect(process.completedAt).toBeInstanceOf(Date);
  });

  it('should generate metadata with process_id', () => {
    const process = Process.create(mockFiles);
    const metadata = process.toMetadata();
    
    expect(metadata).toHaveProperty('process_id');
    expect(metadata.process_id).toBe(process.toDto().id);
    expect(metadata.status).toBe(PROCESS_STATUS.PENDING);
  });
});
