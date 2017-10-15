import ViewModel from '../ViewModel';
import * as apid from '../../../../api';
import { BalloonModelInterface } from '../../Model/Balloon/BallonModel';
import { RecordedApiModelInterface } from '../../Model/Api/RecordedApiModel';
import { SnackbarModelInterface } from '../../Model/Snackbar/SnackbarModel';

interface deleteFile {
    name: string;
    encodedId: number | null;
    checked: boolean;
}

/**
* RecordedMenuViewModel
*/
class RecordedMenuViewModel extends ViewModel {
    private balloon: BalloonModelInterface;
    private recordedApiModel: RecordedApiModelInterface;
    private snackbar: SnackbarModelInterface;
    private recorded: apid.RecordedProgram | null = null;

    public deleteFiles: deleteFile[] = [];

    constructor(
        balloon: BalloonModelInterface,
        recordedApiModel: RecordedApiModelInterface,
        snackbar: SnackbarModelInterface,
    ) {
        super();
        this.balloon = balloon;
        this.recordedApiModel = recordedApiModel;
        this.snackbar = snackbar;
    }

    /**
    * recorded のセット
    * @param recorded: recorded
    */
    public set(recorded: apid.RecordedProgram): void {
        this.recorded = recorded;

        this.deleteFiles = [];
        if(this.recorded.original) {
            this.deleteFiles.push({ name: 'TS', encodedId: null, checked: true });
        }
        if(typeof this.recorded.encoded !== 'undefined') {
            for(let encoded of this.recorded.encoded) {
                this.deleteFiles.push({ name: encoded.name, encodedId: encoded.encodedId, checked: true });
            }
        }
    }

    /**
    * get title
    * @return title
    */
    public getTitle(): string {
        return this.recorded === null ? '' : this.recorded.name;
    }

    /**
    * get rule id
    * @return rule id | null
    */
    public getRuleId(): apid.RuleId | null {
        return this.recorded == null || typeof this.recorded.ruleId === 'undefined' ? null : this.recorded.ruleId;
    }

    /**
    * open delete dialog
    */
    public openDelete(): void {
        this.close();
        setTimeout(() => {
            this.balloon.open(RecordedMenuViewModel.deleteId);
        }, 200);
    }

    /**
    * close balloon
    */
    public close(): void {
        this.balloon.close();
    }

    /**
    * delete recorded file
    */
    public async delete(): Promise<void> {
        if(this.recorded === null) { return; }

        let deleteCnt = 0;
        this.deleteFiles.map((file) => {
            if(file.checked) { deleteCnt += 1; }
        });

        if(deleteCnt === this.deleteFiles.length) {
            // delete all
            try {
                await this.recordedApiModel.deleteAll(this.recorded.id);
                this.snackbar.open(`削除: ${ this.recorded.name }`);
            } catch(err) {
                if(err.message === RecordedApiModelInterface.isStreamingNowError) {
                    this.snackbar.open(`配信中のため削除失敗: ${ this.recorded.name }`);
                } else {
                    console.error(err);
                    this.snackbar.open(`削除失敗: ${ this.recorded.name }`);
                }
            }
        } else {
            let deleteCnt = 0;
            //個別削除
            for(let file of this.deleteFiles) {
                if(!file.checked) { continue; }

                try {
                    await this.recordedApiModel.delete(this.recorded!.id, file.encodedId);
                    deleteCnt += 1;
                } catch(err) {
                    console.error(err);
                    if(err.message === RecordedApiModelInterface.isLockedError) {
                        this.snackbar.open(`ファイルがロックされています: ${ file.name }`);
                    } else {
                        this.snackbar.open(`ファイルの削除に失敗しました: ${ file.name }`);
                    }
                }
            }

            if(deleteCnt > 0) {
                this.snackbar.open(`指定したファイルを削除しました: ${ this.recorded.name }`);
            }
        }

        await this.recordedApiModel.update();
        await this.recordedApiModel.fetchTags();
    }
}

namespace RecordedMenuViewModel {
    export const id = 'recorded-menu'
    export const deleteId = 'recorded-delete'
}

export default RecordedMenuViewModel;

