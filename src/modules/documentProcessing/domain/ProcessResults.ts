import { ValueObject } from '../../../shared/core/domain/ValueObject.ts';

interface ProcessResultsProps {
  totalWords: number;
  totalLines: number;
  mostFrequentWords: string[];
  filesProcessed: string[];
}

export type ProcessResultsDto = ProcessResultsProps;

export class ProcessResults extends ValueObject<ProcessResultsProps, ProcessResultsDto> {
  protected __class = this.constructor.name;

  get totalWords(): ProcessResultsProps['totalWords'] {
    return this.props.totalWords;
  }
  get totalLines(): ProcessResultsProps['totalLines'] {
    return this.props.totalLines;
  }
  get mostFrequentWords(): ProcessResultsProps['mostFrequentWords'] {
    return this.props.mostFrequentWords;
  }
  get filesProcessed(): ProcessResultsProps['filesProcessed'] {
    return this.props.filesProcessed;
  }

  private constructor(props: ProcessResultsProps) {
    super(props);
  }

  public static create(): ProcessResults {
    return new ProcessResults({
      totalWords: 0,
      totalLines: 0,
      mostFrequentWords: [],
      filesProcessed: [],
    })
  }

  public update(currentResults: ProcessResults) {
    this.props.totalWords = currentResults.totalWords;
    this.props.totalLines = currentResults.totalLines;
    this.props.filesProcessed = currentResults.filesProcessed;
  }

  public static assemble(dto: ProcessResultsDto): ProcessResults {
    return new ProcessResults(dto);
  }

  public toDto(): ProcessResultsDto {
    return this.props;
  }
}
