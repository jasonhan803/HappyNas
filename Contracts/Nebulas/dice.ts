import { BigNumber } from "./bignumber";
import { LocalContractStorage, Blockchain, StorageMap, Event } from "./System";

/**
 * Dice Nebulas TypeScript Version * 
 * !!! WARNING !!!
 * REMOVE `import`s ABOVE BEFORE DEPLOY to ANY NETWORK, 
 * imports are intended for TYPE CHECK locally ONLY.
 * @version: 1.0
 */



const BigNumberStorageDescriptor = {
    parse(value: number | string | BigNumber) {
        return new BigNumber(value);
    },
    stringify(o: BigNumber) {
        return o.toString(10);
    }
}

class OwnerableContract {
    admins: StorageMap
    owner: string
    myAddress: string
    constructor() {
        LocalContractStorage.defineProperties(this, {
            owner: null,
            myAddress: null
        })
        LocalContractStorage.defineMapProperties(this, {
            "admins": null
        })
    }

    init() {
        const {
            from
        } = Blockchain.transaction
        this.admins.set(from, "true")
        this.owner = from
    }

    onlyAdmins() {
        const {
            from
        } = Blockchain.transaction
        if (!this.admins.get(from)) {
            throw new Error("Sorry, You don't have the permission as admins.")
        }
    }

    onlyContractOwner() {
        const {
            from
        } = Blockchain.transaction
        if (this.owner !== from) {
            throw new Error("Sorry, But you don't have the permission as owner.")
        }
    }

    getContractOwner() {
        return this.owner
    }

    getAdmins() {
        return this.admins
    }

    setAdmins(address) {
        this.onlyContractOwner()
        this.admins.set(address, "true")
    }

    setMyAddress() {
        this.onlyContractOwner()
        const { to } = Blockchain.transaction
        this.myAddress = to
    }

    withdraw(value: string | BigNumber | number) {
        // Admins can ONLY REQUEST, Owner will GOT THE MONEY ANYWAY
        this.onlyAdmins()
        // Only the owner can have the withdrawed fund, so be careful
        return Blockchain.transfer(this.owner, new BigNumber(value))
    }

    getBalance() {
        const state = Blockchain.getAccountState(this.myAddress)
        var balance = new BigNumber(state.balance);
        return balance
    }

    withdrawAll() {
        this.withdraw(this.getBalance())
    }
}

// extends will trigger `InvalidLHSInAssignment` Invalid left-hand side in assignment
class DiceContract extends OwnerableContract {
    referCut: BigNumber
    constructor() {
        super()
        // So we can take `referCut` as BigNumber object already (No more string to BN conversion now)
        LocalContractStorage.defineProperties(this, {
            referCut: BigNumberStorageDescriptor,
        })
        LocalContractStorage.defineMapProperties(this, {
        })
    }

    _sendCommissionTo(referer: string, actualCost: BigNumber) {
        const { referCut } = this
        if (referer !== "") {
            const withoutCut = new BigNumber(100).dividedToIntegerBy(referCut)
            const cut = actualCost.dividedToIntegerBy(withoutCut)
            Blockchain.transfer(referer, cut)
        }
    }

    _emitEvent(name: string, data: object) {
        Event.Trigger("Dice", { type: name, data });
    }

    // referer by default is empty
    bet(referer = "", bet_number = 50, is_under = true) {
        const {
            from,
            value
        } = Blockchain.transaction

        this._sendCommissionTo(referer, value)

        const roll_number: number = Math.floor(Math.random() * 100);
        var payout: BigNumber = new BigNumber(0);

        if (is_under) {
            if (bet_number < roll_number) {
                payout = new BigNumber(value).times(96).dividedToIntegerBy(bet_number)
            }
        } else {
            if (bet_number > roll_number) {
                payout = new BigNumber(value).times(96).dividedToIntegerBy(99 - bet_number)
            }
        }
        if (payout.gt(0)) {
            Blockchain.transfer(from, payout)
        }
        const betInfo = { bet_number, roll_number, payout }
        this._emitEvent("Bet", betInfo);
        return betInfo
    }



    init() {
        super.init()
        const {
            from
        } = Blockchain.transaction
        this.referCut = new BigNumber(1)
        this.admins.set(from, "true")
        this.owner = from
    }
}

module.exports = DiceContract