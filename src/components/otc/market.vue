<template>
    <div>
      <el-card class="box-card">
        <div slot="header" class="clearfix">
          <h1 class="title"> {{inExchangeFor}} </h1>
        </div>
        <el-row class="eos-orders-list" :gutter="20">
                <el-col :span="8" class="order-info-section" v-for="order in ordersList" :key="order.id">
                  <OrderView class="order-view" :order="order" />
                </el-col>
        </el-row>
      </el-card>
    </div>
</template>

<script>
import * as store from "../../store.js";
import { getOrders } from "./orders";
import OrderView from "./order";
export default {
  components: {
    OrderView
  },
  props: ['currentToken'],
  data() {
    return {
      store: store.store,
      ordersList: [],
    };
  },
  computed: {
    inExchangeFor() {
      return `以...兑换 ${this.currentToken.tokenSymbol}`
    },
  },
  async created() {
    this.ordersList = await getOrders(this.currentToken.tokenContract);
  },
  watch: {
    async currentToken(newVal, oldVal) {
      this.ordersList = await getOrders(newVal.tokenContract)
    }
  },
  methods: {
    initIdentity() {
      store.initIdentity();
    },

    async ask_order() {
      const {bid_token_contract, ask_token_contract, ask, bid} = this
      const memo = `ask,${ask},${ask_token_contract}`

      try {
        var contract = this.store.scatter.contract(bid_token_contract);
        await contract.transfer(
          this.store.account.name,
          "eosotcbackup",
          `${bid}`,
          `${memo}`,
           {
            authorization: [`${this.store.account.name}@${this.store.account.authority}`]
           }
        );
        this.$notify.success({
          title: '挂单成功',
          message: "请耐心等待"
        });
      } catch (error) {
        this.$notify.error({
          title: '交易失败',
          message: error.message
        });
      }
    },

    roll: function() {
      this.loading = true;
      let memo = `bet ${
        this.choose === "small" ? this.range + 100 : this.range
      } ${this.store.seed}`;
      const referral = this.store.referral;
      if (referral) {
        memo += ` ${referral}`;
      }
      this.store.scatter
        .transfer(
          this.store.account.name,
          "happyeosdice",
          `${this.betAmount.toFixed(4)} EOS`,
          memo
        )
        .then(() => {
          // 轮询查找结果
          const r = setInterval(() => {
            this.store.scatter
              .getTableRows(
                true,
                "happyeosdice",
                this.store.account.name,
                "result",
                "0"
              )
              .then(data => {
                const ans = data.rows[0].roll_number;
                // roll点值为0-99
                if (ans < 100) {
                  clearInterval(r);
                  this.loading = false;
                  if (
                    (this.choose === "small" && ans < this.range) ||
                    (this.choose === "big" && ans > this.range)
                  ) {
                    this.roll_success(ans);
                  } else {
                    this.roll_fail(ans);
                  }
                }
              });
          }, 1000);
        })
        .catch(err => {
          console.error(err);
          alert("项目出错了，快联系开发者！");
        });
    }
  }
};
</script>

<style scoped>
.order-view {
  margin: 0.5rem 0;
}
</style>
