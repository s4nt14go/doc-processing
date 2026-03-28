import { ValueObject } from '@shared/core/domain/ValueObject.js';

interface ProcessProgressProps {
  totalFiles: number;
  processedFiles: number;
  percentage: number;
}

export type ProcessProgressDto = ProcessProgressProps;

export class ProcessProgress extends ValueObject<ProcessProgressProps, ProcessProgressDto> {
  protected __class = this.constructor.name;

  get totalFiles(): ProcessProgressProps['totalFiles'] {
    return this.props.totalFiles;
  }
  get processedFiles(): ProcessProgressProps['processedFiles'] {
    return this.props.processedFiles;
  }
  get percentage(): ProcessProgressProps['percentage'] {
    return this.props.percentage;
  }

  private constructor(props: ProcessProgressProps) {
    super(props);
  }

  public static create(totalFiles: number): ProcessProgress {
    return new ProcessProgress({
      totalFiles,
      processedFiles: 0,
      percentage: 0,
    })
  }

  public filesProcessed(qty: number) {
    this.props.processedFiles = this.props.processedFiles + qty;
    if (this.props.processedFiles > this.props.totalFiles)
      throw new Error(`Processed files greater than ${this.props.totalFiles} total files`);

    this.props.percentage = Math.round(
      (this.props.processedFiles / this.props.totalFiles) * 100,
    );
  }

  public toDto(): ProcessProgressDto {
    return this.props;
  }
}
