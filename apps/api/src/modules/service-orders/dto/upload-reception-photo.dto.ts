import { IsEnum } from 'class-validator';
import { ReceptionPhotoAngleEnum } from '../entities/reception-photo.entity';

export class UploadReceptionPhotoDto {
  @IsEnum(ReceptionPhotoAngleEnum)
  angle: ReceptionPhotoAngleEnum;
}
